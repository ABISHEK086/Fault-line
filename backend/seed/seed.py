
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # import db.py

from dotenv import load_dotenv
from db import init_driver, close_driver, DatabaseUnavailableError

load_dotenv()

CONSTRAINTS = [
    "CREATE CONSTRAINT pkg_id IF NOT EXISTS FOR (p:Package) REQUIRE p.id IS UNIQUE",
    "CREATE CONSTRAINT svc_id IF NOT EXISTS FOR (s:Service) REQUIRE s.id IS UNIQUE",
    "CREATE CONSTRAINT team_id IF NOT EXISTS FOR (t:Team) REQUIRE t.id IS UNIQUE",
    "CREATE CONSTRAINT vuln_id IF NOT EXISTS FOR (v:Vulnerability) REQUIRE v.id IS UNIQUE","CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE",
    "CREATE INDEX pkg_name IF NOT EXISTS FOR (p:Package) ON (p.name)",
]


def run(session, cypher, params=None):
    session.execute_write(lambda tx: tx.run(cypher, params or {}).consume())


def seed(data):
    driver = init_driver()
    with driver.session() as session:
        print("Ensuring constraints & indexes...")
        for c in CONSTRAINTS:
            run(session, c)

        print(f"Loading {len(data['teams'])} teams...")
        run(session, """
            UNWIND $rows AS row
            MERGE (t:Team {id: row.id}) SET t.name = row.name
        """, {"rows": data["teams"]})

        print(f"Loading {len(data['packages'])} packages...")
        run(session, """
            UNWIND $rows AS row
            MERGE (p:Package {id: row.id})
            SET p.name = row.name, p.ecosystem = row.ecosystem, p.version = row.version
        """, {"rows": data["packages"]})

        print(f"Loading {len(data['services'])} services + OWNED_BY...")
        run(session, """
            UNWIND $rows AS row
            MERGE (s:Service {id: row.id})
            SET s.name = row.name, s.tier = row.tier
            WITH s, row
            MATCH (t:Team {name: row.team})
            MERGE (s)-[:OWNED_BY]->(t)
        """, {"rows": data["services"]})

        print(f"Loading {len(data['depends_on'])} DEPENDS_ON edges...")
        run(session, """
            UNWIND $rows AS row
            MATCH (a:Package {name: row.from}), (b:Package {name: row.to})
            MERGE (a)-[:DEPENDS_ON]->(b)
        """, {"rows": data["depends_on"]})

        print(f"Loading {len(data['uses'])} USES edges...")
        run(session, """
            UNWIND $rows AS row
            MATCH (s:Service {name: row.service}), (p:Package {name: row.package})
            MERGE (s)-[:USES]->(p)
        """, {"rows": data["uses"]})

        print(f"Loading {len(data['vulnerabilities'])} vulnerabilities...")
        run(session, """
            UNWIND $rows AS row
            MERGE (v:Vulnerability {id: row.id})
            SET v.cve = row.cve, v.severity = row.severity,
                v.summary = row.summary, v.published = row.published
            WITH v, row
            MATCH (p:Package {name: row.package})
            MERGE (p)-[:HAS_VULNERABILITY]->(v)
        """, {"rows": data["vulnerabilities"]})

    print("Done.")


if __name__ == "__main__":
    data_path = Path(__file__).parent / "data.json"
    if not data_path.exists():
        print("data.json not found — run generate_data.py first.")
        sys.exit(1)

    data = json.loads(data_path.read_text())
    try:
        seed(data)
    except DatabaseUnavailableError as exc:
        print(f"Could not reach CognoDB: {exc}")
        print("Check backend/.env has NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD set correctly.")
        sys.exit(1)
    finally:
        close_driver()
