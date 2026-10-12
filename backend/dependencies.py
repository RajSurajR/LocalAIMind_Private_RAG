"""Dependency injection helpers for FastAPI.

FastAPI resolves these functions automatically when route handlers request a
session or service object. This keeps the controller logic thin and the database
logic reusable.
"""

from sqlalchemy.orm import Session

from backend.database import SessionLocal


def get_db():
    """Yield a database session for each request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


