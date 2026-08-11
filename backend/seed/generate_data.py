"""
Generates realistic synthetic seed data for the DepGraph demo: an internal
software org with packages, transitive dependency chains, services, teams
and a handful of CVEs. Deterministic (seeded) so the demo is reproducible.

Run directly to (re)write seed/data.json:
    python generate_data.py
"""
import json
import random
from pathlib import Path

random.seed(42)

TEAMS = [
    "Platform", "Payments", "Identity", "Growth", "Search",
    "Data Platform", "Notifications", "Checkout", "Mobile", "Security",
]

# (service name, tier, team)
SERVICES = [
    ("api-gateway", "critical", "Platform"),
    ("auth-service", "critical", "Identity"),
    ("session-service", "critical", "Identity"),
    ("user-profile-service", "standard", "Identity"),
    ("payment-processor", "critical", "Payments"),
    ("invoice-service", "standard", "Payments"),
    ("ledger-service", "critical", "Payments"),
    ("cart-service", "critical", "Checkout"),
    ("checkout-api", "critical", "Checkout"),
    ("pricing-engine", "standard", "Checkout"),
    ("recommendation-engine", "standard", "Growth"),
    ("email-campaign-service", "standard", "Growth"),
    ("ab-testing-service", "internal", "Growth"),
    ("search-api", "critical", "Search"),
    ("indexing-worker", "standard", "Search"),
    ("autocomplete-service", "standard", "Search"),
    ("analytics-pipeline", "standard", "Data Platform"),
    ("etl-worker", "internal", "Data Platform"),
    ("reporting-service", "internal", "Data Platform"),
    ("data-warehouse-sync", "standard", "Data Platform"),
    ("push-notification-service", "standard", "Notifications"),
    ("email-sender", "standard", "Notifications"),
    ("sms-gateway", "standard", "Notifications"),
    ("mobile-bff", "critical", "Mobile"),
    ("mobile-auth-bridge", "standard", "Mobile"),
    ("feature-flag-service", "internal", "Platform"),
    ("config-service", "internal", "Platform"),
    ("logging-pipeline", "standard", "Platform"),
    ("audit-log-service", "critical", "Security"),
    ("secrets-vault-proxy", "critical", "Security"),
    ("fraud-detection-service", "critical", "Security"),
    ("rate-limiter", "standard", "Platform"),
    ("image-resizer", "internal", "Growth"),
    ("webhook-dispatcher", "standard", "Platform"),
    ("order-fulfillment-service", "critical", "Checkout"),
]

# Layer 0: foundational / widely-reused packages (npm + pypi + maven mix)
LAYER0 = [
    ("lodash", "npm", "4.17.21"), ("axios", "npm", "1.6.8"),
    ("express", "npm", "4.19.2"), ("react", "npm", "18.2.0"),
    ("next", "npm", "14.2.3"), ("tailwindcss", "npm", "3.4.3"),
    ("jsonwebtoken", "npm", "9.0.2"), ("bcrypt", "npm", "5.1.1"),
    ("uuid", "npm", "9.0.1"), ("dotenv", "npm", "16.4.5"),
    ("requests", "pypi", "2.31.0"), ("flask", "pypi", "3.0.3"),
    ("numpy", "pypi", "1.26.4"), ("pandas", "pypi", "2.2.2"),
    ("cryptography", "pypi", "42.0.5"), ("pyyaml", "pypi", "6.0.1"),
    ("celery", "pypi", "5.4.0"), ("sqlalchemy", "pypi", "2.0.30"),
    ("jinja2", "pypi", "3.1.4"), ("gunicorn", "pypi", "22.0.0"),
    ("log4j-core", "maven", "2.17.1"), ("jackson-databind", "maven", "2.17.0"),
    ("spring-web", "maven", "6.1.6"), ("guava", "maven", "33.1.0"),
    ("okhttp", "maven", "4.12.0"),
]

# Layer 1: mid-level libs, each depends on 1-3 layer-0 packages
LAYER1_NAMES = [
    ("passport", "npm"), ("multer", "npm"), ("nodemailer", "npm"),
    ("stripe", "npm"), ("redis", "npm"), ("prom-client", "npm"),
    ("winston", "npm"), ("joi", "npm"), ("ioredis", "npm"), ("bull", "npm"),
    ("djangorestframework", "pypi"), ("boto3", "pypi"), ("pydantic", "pypi"),
    ("httpx", "pypi"), ("pillow", "pypi"), ("alembic", "pypi"),
    ("elasticsearch-py", "pypi"), ("kafka-python", "pypi"),
    ("spring-boot-starter-web", "maven"), ("hibernate-core", "maven"),
    ("logback-classic", "maven"), ("junit", "maven"),
]

# Layer 2: internal-style thin wrappers, each depends on 1-2 layer-1 packages
LAYER2_NAMES = [
    ("internal-auth-sdk", "npm"), ("internal-http-client", "npm"),
    ("internal-logging-sdk", "npm"), ("internal-payments-sdk", "npm"),
    ("internal-notifications-sdk", "npm"),
    ("internal-ml-toolkit", "pypi"), ("internal-data-client", "pypi"),
    ("internal-search-client", "pypi"),
    ("internal-audit-lib", "maven"),
]

CVE_POOL = [
    ("CVE-2024-9901", "CRITICAL", "Remote code execution via crafted log message context lookup."),
    ("CVE-2024-3742", "CRITICAL", "Deserialization of untrusted data allows arbitrary code execution."),
    ("CVE-2023-8815", "HIGH", "Prototype pollution allows privilege escalation in downstream apps."),
    ("CVE-2024-1122", "HIGH", "Improper JWT signature verification allows auth bypass."),
    ("CVE-2023-5590", "MEDIUM", "ReDoS in header-parsing regex causes request-thread exhaustion."),
    ("CVE-2024-6601", "MEDIUM", "Path traversal in file-upload handling."),
    ("CVE-2024-0087", "LOW", "Verbose error output can leak internal stack traces."),
]


def build():
    packages = []
    pkg_index = {}

    def add_pkg(name, ecosystem, version):
        pid = f"pkg_{len(packages)}"
        packages.append({"id": pid, "name": name, "ecosystem": ecosystem, "version": version})
        pkg_index[name] = pid
        return pid

    for name, eco, ver in LAYER0:
        add_pkg(name, eco, ver)

    depends_on = []  # (fromName, toName)

    layer0_by_eco = {}
    for name, eco, _ in LAYER0:
        layer0_by_eco.setdefault(eco, []).append(name)

    for name, eco in LAYER1_NAMES:
        add_pkg(name, eco, f"{random.randint(1,6)}.{random.randint(0,20)}.{random.randint(0,9)}")
        pool = layer0_by_eco.get(eco, [n for n, _, _ in LAYER0])
        for dep in random.sample(pool, k=min(len(pool), random.randint(1, 3))):
            depends_on.append((name, dep))

    layer1_by_eco = {}
    for name, eco in LAYER1_NAMES:
        layer1_by_eco.setdefault(eco, []).append(name)

    for name, eco in LAYER2_NAMES:
        add_pkg(name, eco, f"{random.randint(1,3)}.{random.randint(0,9)}.0")
        pool = layer1_by_eco.get(eco, [n for n, _ in LAYER1_NAMES])
        for dep in random.sample(pool, k=min(len(pool), random.randint(1, 2))):
            depends_on.append((name, dep))
        # occasionally also reach straight down to a layer-0 package
        if random.random() < 0.5:
            l0pool = layer0_by_eco.get(eco, [n for n, _, _ in LAYER0])
            depends_on.append((name, random.choice(l0pool)))

    # Services: each uses 3-7 packages, biased toward layer1/layer2 (realistic:
    # apps import mid-level libs and internal SDKs directly, not raw core libs)
    directly_usable = [n for n, _ in LAYER1_NAMES] + [n for n, _ in LAYER2_NAMES]
    uses = []  # (serviceName, packageName)
    for svc_name, tier, team in SERVICES:
        k = random.randint(3, 7)
        for pkg_name in random.sample(directly_usable, k=k):
            uses.append((svc_name, pkg_name))
        # every service also uses at least one universally common layer-0 lib
        uses.append((svc_name, random.choice(["axios", "requests", "lodash", "uuid"])))

    # Vulnerabilities: attach to a mix of foundational (log4j-core, jackson,
    # a jwt lib) and deeper packages so blast radius varies dramatically —
    # this is the demo's whole point.
    vuln_targets = [
        "log4j-core", "jackson-databind", "jsonwebtoken", "pyyaml",
        "internal-http-client", "pillow", "spring-web", "logback-classic",
    ]
    vulnerabilities = []
    for i, target in enumerate(vuln_targets):
        cve, severity, summary = CVE_POOL[i % len(CVE_POOL)]
        vulnerabilities.append({
            "id": f"vuln_{i}",
            "cve": cve,
            "severity": severity,
            "summary": summary,
            "published": f"2024-{(i % 12) + 1:02d}-{(i * 3 % 27) + 1:02d}",
            "package": target,
        })

    teams = [{"id": f"team_{i}", "name": t} for i, t in enumerate(TEAMS)]
    services = [
        {"id": f"svc_{i}", "name": n, "tier": tier, "team": team}
        for i, (n, tier, team) in enumerate(SERVICES)
    ]

    return {
        "teams": teams,
        "packages": packages,
        "services": services,
        "depends_on": [{"from": a, "to": b} for a, b in depends_on],
        "uses": [{"service": s, "package": p} for s, p in uses],
        "vulnerabilities": vulnerabilities,
    }


if __name__ == "__main__":
    data = build()
    out = Path(__file__).parent / "data.json"
    out.write_text(json.dumps(data, indent=2))
    print(f"Wrote {out} — {len(data['packages'])} packages, "
          f"{len(data['services'])} services, {len(data['depends_on'])} DEPENDS_ON edges, "
          f"{len(data['vulnerabilities'])} vulnerabilities.")
