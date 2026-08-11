import uuid
from werkzeug.security import generate_password_hash, check_password_hash

from db import run_query


def find_user_by_email(email):
    rows = run_query(
        """
        MATCH (u:User {email: $email})
        RETURN u.id AS id, u.email AS email, u.name AS name,
               u.passwordHash AS passwordHash, u.provider AS provider
        """,
        {"email": email},
    )
    return rows[0] if rows else None


def create_user(email, password, name):
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    password_hash = generate_password_hash(password)
    run_query(
        """
        CREATE (u:User {
          id: $id, email: $email, passwordHash: $passwordHash,
          name: $name, provider: 'credentials', createdAt: timestamp()
        })
        """,
        {"id": user_id, "email": email, "passwordHash": password_hash, "name": name},
        read=False,
    )
    return {"id": user_id, "email": email, "name": name}


def verify_password(user, password):
    if not user or not user.get("passwordHash"):
        return False
    return check_password_hash(user["passwordHash"], password)


def upsert_oauth_user(email, name, provider):
    rows = run_query(
        """
        MERGE (u:User {email: $email})
        ON CREATE SET u.id = $id, u.name = $name, u.provider = $provider,
                       u.createdAt = timestamp()
        ON MATCH SET u.name = $name
        RETURN u.id AS id, u.email AS email, u.name AS name
        """,
        {"email": email, "name": name, "provider": provider, "id": f"user_{uuid.uuid4().hex[:12]}"},
        read=False,
    )
    return rows[0]