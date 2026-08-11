
import os
import logging
from contextlib import contextmanager

from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError, Neo4jError

logger = logging.getLogger("depgraph.db")

_driver = None


class DatabaseUnavailableError(Exception):
    """Raised when CognoDB cannot be reached or rejects auth.
    Routes catch this and return a clean 503 instead of a stack trace."""


def init_driver():
    """Create (or reuse) a singleton driver instance. Lazy — the app can
    still boot and serve /api/health even if the DB is down."""
    global _driver
    if _driver is not None:
        return _driver

    uri = os.environ.get("NEO4J_URI")
    user = os.environ.get("NEO4J_USER")
    password = os.environ.get("NEO4J_PASSWORD")

    if not uri or not user or not password:
        raise DatabaseUnavailableError(
            "NEO4J_URI, NEO4J_USER and NEO4J_PASSWORD must be set "
            "(copy backend/.env.example to backend/.env and fill them in)."
        )

    try:
        _driver = GraphDatabase.driver(uri, auth=(user, password))
        _driver.verify_connectivity()
        logger.info("Connected to CognoDB at %s", uri)
    except (ServiceUnavailable, AuthError, ValueError) as exc:
        _driver = None
        raise DatabaseUnavailableError(f"Could not connect to CognoDB: {exc}") from exc

    return _driver


def close_driver():
    global _driver
    if _driver is not None:
        _driver.close()
        _driver = None


@contextmanager
def get_session():
    """Yields a Neo4j session, wrapping connectivity/query errors in
    DatabaseUnavailableError so route handlers only need one except clause."""
    driver = init_driver()
    session = driver.session()
    try:
        yield session
    except (ServiceUnavailable, AuthError) as exc:
        raise DatabaseUnavailableError(f"CognoDB is unreachable: {exc}") from exc
    except Neo4jError as exc:
        # Query-level errors (bad Cypher, constraint violation, etc.) — surface
        # as a 500 rather than masquerading as a connectivity problem.
        logger.exception("Cypher query failed")
        raise
    finally:
        session.close()


def run_query(cypher, params=None, read=True):
    """Run a single parameterised Cypher query and return a list of dicts.
    `read`/`write` distinction lets us route through the right transaction
    function, which matters for driver-side routing against clustered
    instances."""
    params = params or {}
    with get_session() as session:
        if read:
            result = session.execute_read(lambda tx: list(tx.run(cypher, params)))
        else:
            result = session.execute_write(lambda tx: list(tx.run(cypher, params)))
        return [record.data() for record in result]
