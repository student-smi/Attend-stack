import bcrypt
import hashlib


def _prepare(password: str) -> bytes:
    """Pre-hash with SHA-256 so bcrypt never sees > 72 bytes."""
    return hashlib.sha256(password.encode()).hexdigest().encode()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prepare(password), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(_prepare(password), hashed.encode())
