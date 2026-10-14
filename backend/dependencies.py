"""Dependency injection helpers for FastAPI.

FastAPI resolves these functions automatically when route handlers request a
session or service object. This keeps the controller logic thin and the database
logic reusable.
"""

from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend.services.pdf_service import PDFService
from backend.services.rag_service import RAGService


def get_pdf_service() -> PDFService:
    """Return a PDFService instance."""
    return PDFService()

def get_rag_service() -> RAGService:
    """Return a RAGService instance."""
    return RAGService()

def get_db():
    """Yield a database session for each request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


