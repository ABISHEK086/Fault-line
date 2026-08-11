import os
import logging

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from neo4j.exceptions import Neo4jError

import queries
import auth as auth_queries
from db import init_driver, close_driver, DatabaseUnavailableError

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("depgraph.app")

app = Flask(__name__)
CORS(app, origins=[os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")])


@app.errorhandler(DatabaseUnavailableError)
def handle_db_unavailable(err):
    logger.warning("CognoDB unavailable: %s", err)
    return jsonify({
        "error": "database_unavailable",
        "message": str(err),
    }), 503


@app.errorhandler(Neo4jError)
def handle_query_error(err):
    logger.exception("Query failed")
    return jsonify({
        "error": "query_failed",
        "message": "The database rejected that query.",
    }), 500


@app.errorhandler(404)
def handle_not_found(err):
    return jsonify({"error": "not_found", "message": "No resource matches that id."}), 404


@app.get("/api/health")
def health():
    """Doesn't require the DB to be up — lets the frontend show a clean
    'database unreachable' empty state instead of a blank crash."""
    try:
        init_driver()
        return jsonify({"status": "ok", "database": "connected"})
    except DatabaseUnavailableError as exc:
        return jsonify({"status": "degraded", "database": "unreachable", "detail": str(exc)}), 200


@app.get("/api/vulnerabilities")
def get_vulnerabilities():
    return jsonify(queries.list_vulnerabilities())


@app.get("/api/vulnerabilities/<vuln_id>/blast-radius")
def get_blast_radius(vuln_id):
    rows = queries.vulnerability_blast_radius(vuln_id)
    if not rows:
        return jsonify({"error": "not_found", "message": "Unknown vulnerability id."}), 404

    services = {}
    for row in rows:
        svc = services.setdefault(row["serviceId"], {
            "id": row["serviceId"], "name": row["serviceName"], "tier": row["serviceTier"],
            "teamId": row["teamId"], "teamName": row["teamName"], "viaPackages": set(),
        })
        svc["viaPackages"].add(row["viaPackage"])

    for svc in services.values():
        svc["viaPackages"] = sorted(svc["viaPackages"])

    first = rows[0]
    return jsonify({
        "cve": first["cve"],
        "severity": first["severity"],
        "summary": first["summary"],
        "vulnerablePackage": first["vulnerablePackage"],
        "affectedServiceCount": len(services),
        "services": list(services.values()),
    })


@app.get("/api/vulnerabilities/<vuln_id>/path/<service_id>")
def get_path(vuln_id, service_id):
    path = queries.shortest_path_to_vulnerability(service_id, vuln_id)
    if not path:
        return jsonify({"error": "not_found", "message": "No dependency path found."}), 404
    return jsonify(path)


@app.get("/api/services")
def get_services():
    return jsonify(queries.list_services())


@app.get("/api/services/<service_id>/dependencies")
def get_service_dependencies(service_id):
    tree = queries.service_dependency_tree(service_id)
    if not tree:
        return jsonify({"error": "not_found", "message": "Unknown service id."}), 404
    return jsonify(tree)


@app.get("/api/packages")
def get_packages():
    term = request.args.get("q", "")
    if not term:
        return jsonify([])
    return jsonify(queries.search_packages(term))


@app.get("/api/dashboard/critical-packages")
def get_critical_packages():
    return jsonify(queries.critical_packages())


@app.get("/api/dashboard/team-exposure")
def get_team_exposure():
    return jsonify(queries.team_exposure())


@app.post("/api/auth/register")
def register():
    """Email/password sign-up, called from the Next.js signup page."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    name = (data.get("name") or "").strip() or email.split("@")[0]

    if not email or "@" not in email:
        return jsonify({"error": "invalid_email", "message": "Enter a valid email address."}), 400
    if len(password) < 8:
        return jsonify({"error": "weak_password", "message": "Password must be at least 8 characters."}), 400

    if auth_queries.find_user_by_email(email):
        return jsonify({"error": "email_taken", "message": "An account with that email already exists."}), 409

    user = auth_queries.create_user(email, password, name)
    return jsonify(user), 201


@app.post("/api/auth/login")
def login():
    """Email/password sign-in. Called by NextAuth's CredentialsProvider,
    not directly by the browser."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = auth_queries.find_user_by_email(email)
    if not user or not auth_queries.verify_password(user, password):
        return jsonify({"error": "invalid_credentials", "message": "Incorrect email or password."}), 401

    return jsonify({"id": user["id"], "email": user["email"], "name": user["name"]})


@app.post("/api/auth/oauth-upsert")
def oauth_upsert():
    """Called by NextAuth's signIn callback on every Google sign-in, to
    keep a matching :User node in the graph."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    name = data.get("name") or email.split("@")[0]
    provider = data.get("provider", "google")

    if not email:
        return jsonify({"error": "invalid_email", "message": "Missing email."}), 400

    user = auth_queries.upsert_oauth_user(email, name, provider)
    return jsonify(user)


@app.teardown_appcontext
def shutdown(exception=None):
    pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    try:
        init_driver()
    except DatabaseUnavailableError as exc:
        logger.warning("Starting without a DB connection (will retry per-request): %s", exc)
    app.run(host="0.0.0.0", port=port, debug=True)
