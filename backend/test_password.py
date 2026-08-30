"""
test_password.py
=================
Tests for the password feature:
  1. auth/password.py  — hash_password() and verify_password()
  2. PATCH /{student_id}/change-password  — endpoint logic (via FastAPI TestClient)
  3. PATCH /{teacher_id}/change-password  — endpoint logic (via FastAPI TestClient)

Run from the backend/ directory:
    python -m pytest test_password.py -v
"""

import sys
import os
import pytest

# ---------------------------------------------------------------------------
# Make sure the backend package root is on sys.path when running standalone
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(__file__))

# ===========================================================================
# SECTION 1 — Unit tests for auth/password.py
# ===========================================================================
from auth.password import hash_password, verify_password


class TestHashPassword:
    def test_returns_string(self):
        result = hash_password("mypassword")
        assert isinstance(result, str), "hash_password should return a str"

    def test_hash_is_not_plaintext(self):
        pw = "secret123"
        result = hash_password(pw)
        assert pw not in result, "Hash must not contain the plaintext password"

    def test_different_hashes_for_same_password(self):
        pw = "samepassword"
        h1 = hash_password(pw)
        h2 = hash_password(pw)
        assert h1 != h2, "bcrypt salts should make every hash unique"

    def test_bcrypt_prefix(self):
        result = hash_password("anything")
        assert result.startswith("$2b$"), "bcrypt hashes should start with $2b$"


class TestVerifyPassword:
    def test_correct_password_returns_true(self):
        pw = "correct_password"
        hashed = hash_password(pw)
        assert verify_password(pw, hashed) is True

    def test_wrong_password_returns_false(self):
        pw = "correct_password"
        hashed = hash_password(pw)
        assert verify_password("wrong_password", hashed) is False

    def test_empty_password_returns_false(self):
        hashed = hash_password("real_password")
        assert verify_password("", hashed) is False

    def test_case_sensitive(self):
        pw = "Password123"
        hashed = hash_password(pw)
        assert verify_password("password123", hashed) is False
        assert verify_password("PASSWORD123", hashed) is False
        assert verify_password(pw, hashed) is True

    def test_special_characters(self):
        pw = "p@$$w0rd!#%"
        hashed = hash_password(pw)
        assert verify_password(pw, hashed) is True

    def test_unicode_password(self):
        pw = "pässwörд"
        hashed = hash_password(pw)
        assert verify_password(pw, hashed) is True

    def test_long_password(self):
        # Passwords > 72 bytes are safe thanks to SHA-256 pre-hashing.
        pw = "a" * 200
        hashed = hash_password(pw)
        assert verify_password(pw, hashed) is True
        # A different 200-char password must NOT match
        assert verify_password("b" * 200, hashed) is False


# ===========================================================================
# SECTION 2 — Integration-style tests for the change-password endpoints
#             Uses FastAPI TestClient with an in-memory SQLite database
#             so no real DB / running server is needed.
# ===========================================================================
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Patch env vars BEFORE importing anything that reads them
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_password_temp.db")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")

from database import Base, get_db
from main import app
from models.user import User
from models.student import Student
from models.teacher import Teacher
from auth.jwt_handler import create_access_token

# ---- SQLite test engine ----
# Use the native UUID type so SQLite accepts plain uuid.UUID objects
from sqlalchemy import String as SAString
from sqlalchemy.types import TypeDecorator


class UUIDString(TypeDecorator):
    """Stores UUIDs as plain strings in SQLite."""
    impl = SAString(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        return value


_TEST_DB = "sqlite:///./test_password_temp.db"
engine = create_engine(_TEST_DB, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Monkey-patch all UUID columns to use UUIDString so SQLite is happy
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy import event
from sqlalchemy.engine import Engine


@event.listens_for(Engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _):
    """Enable FK support in SQLite (optional but good practice)."""
    try:
        dbapi_conn.execute("PRAGMA foreign_keys=OFF")
    except Exception:
        pass


# Remap PostgreSQL UUID columns to plain TEXT for SQLite table creation
for mapper in Base.registry.mappers:
    for col in mapper.persist_selectable.columns:
        if isinstance(col.type, PGUUID):
            col.type = UUIDString()

Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

# ---- Admin token (use plain string IDs everywhere) ----
_ADMIN_ID = str(uuid.uuid4())


def _seed_admin() -> str:
    db = TestingSessionLocal()
    try:
        admin = db.query(User).filter(User.email == "admin@test.com").first()
        if not admin:
            admin = User(
                id=str(uuid.uuid4()),
                email="admin@test.com",
                password=hash_password("admin123"),
                role="admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
        return str(admin.id)
    finally:
        db.close()


def _admin_token() -> str:
    admin_id = _seed_admin()
    return create_access_token({"sub": admin_id, "role": "admin"})


def _make_student(db):
    uid = str(uuid.uuid4())
    sid = str(uuid.uuid4())
    short = uid.replace("-", "")[:8]
    user = User(
        id=uid,
        email=f"s_{short}@t.com",
        password=hash_password("init"),
        role="student",
        is_active=True,
    )
    student = Student(
        id=sid,
        student_id=f"STU{short}",
        name="T Student",
        email=f"stu_{short}@t.com",
        roll_number=f"R{short[:6]}",
        user_id=uid,
    )
    db.add(user)
    db.add(student)
    db.commit()
    db.refresh(student)
    db.refresh(user)
    return student, user


def _make_teacher(db):
    uid = str(uuid.uuid4())
    tid = str(uuid.uuid4())
    short = uid.replace("-", "")[:8]
    user = User(
        id=uid,
        email=f"t_{short}@t.com",
        password=hash_password("init"),
        role="teacher",
        is_active=True,
    )
    teacher = Teacher(
        id=tid,
        name="T Teacher",
        email=f"t_{short}@t.com",
        user_id=uid,
    )
    db.add(user)
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    db.refresh(user)
    return teacher, user


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def admin_headers():
    return {"Authorization": f"Bearer {_admin_token()}"}


# -------- Student endpoint --------

class TestStudentChangePassword:

    def test_success_changes_password(self, client, admin_headers):
        db = TestingSessionLocal()
        student, user = _make_student(db)
        db.close()

        resp = client.patch(
            f"/students/{student.id}/change-password",
            json={"new_password": "newpass99"},
            headers=admin_headers,
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["message"] == "Password updated successfully"
        assert body["email"] == user.email

        # Confirm the stored hash matches the new password
        db2 = TestingSessionLocal()
        u = db2.query(User).filter(User.id == user.id).first()
        assert verify_password("newpass99", u.password)
        db2.close()

    def test_too_short_rejected(self, client, admin_headers):
        db = TestingSessionLocal()
        student, _ = _make_student(db)
        db.close()

        resp = client.patch(
            f"/students/{student.id}/change-password",
            json={"new_password": "abc"},
            headers=admin_headers,
        )
        assert resp.status_code == 400
        assert "4 characters" in resp.json()["detail"]

    def test_whitespace_only_rejected(self, client, admin_headers):
        db = TestingSessionLocal()
        student, _ = _make_student(db)
        db.close()

        resp = client.patch(
            f"/students/{student.id}/change-password",
            json={"new_password": "   "},
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_nonexistent_student_404(self, client, admin_headers):
        resp = client.patch(
            "/students/00000000-0000-0000-0000-000000000000/change-password",
            json={"new_password": "validpass"},
            headers=admin_headers,
        )
        assert resp.status_code == 404

    def test_no_token_rejected(self, client):
        resp = client.patch(
            "/students/00000000-0000-0000-0000-000000000000/change-password",
            json={"new_password": "validpass"},
        )
        assert resp.status_code in (401, 403)


# -------- Teacher endpoint --------

class TestTeacherChangePassword:

    def test_success_changes_password(self, client, admin_headers):
        db = TestingSessionLocal()
        teacher, user = _make_teacher(db)
        db.close()

        resp = client.patch(
            f"/teachers/{teacher.id}/change-password",
            json={"new_password": "teach3rPass!"},
            headers=admin_headers,
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["message"] == "Password updated successfully"
        assert body["email"] == user.email

        db2 = TestingSessionLocal()
        u = db2.query(User).filter(User.id == user.id).first()
        assert verify_password("teach3rPass!", u.password)
        db2.close()

    def test_too_short_rejected(self, client, admin_headers):
        db = TestingSessionLocal()
        teacher, _ = _make_teacher(db)
        db.close()

        resp = client.patch(
            f"/teachers/{teacher.id}/change-password",
            json={"new_password": "xy"},
            headers=admin_headers,
        )
        assert resp.status_code == 400
        assert "4 characters" in resp.json()["detail"]

    def test_nonexistent_teacher_404(self, client, admin_headers):
        resp = client.patch(
            "/teachers/00000000-0000-0000-0000-000000000000/change-password",
            json={"new_password": "validpass"},
            headers=admin_headers,
        )
        assert resp.status_code == 404

    def test_no_token_rejected(self, client):
        resp = client.patch(
            "/teachers/00000000-0000-0000-0000-000000000000/change-password",
            json={"new_password": "validpass"},
        )
        assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Cleanup temp SQLite file after all tests finish
# ---------------------------------------------------------------------------
def pytest_sessionfinish(session, exitstatus):
    db_path = os.path.join(os.path.dirname(__file__), "test_password_temp.db")
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except OSError:
            pass
