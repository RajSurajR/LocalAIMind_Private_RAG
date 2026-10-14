"""Health endpoint for the API."""

import logging
from pathlib import Path

import chromadb
import ollama
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import PDFMetadata
from backend.dependencies import get_db
from backend.models import HealthResponse

router = APIRouter(
    prefix="/api/v1/health",
    tags=["health"]
)
logger = logging.getLogger(__name__)


@router.get("", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)):
    """Check if the API and Ollama are running correctly."""

    # 1. check ollama
    ollama_connected = False
    try:
        ollama.list()
        ollama_connected = True
    except Exception:  # pragma: no cover - environment dependent
        logger.exception("Ollama health check failed")

    # 2. check sql db and cnt pdf
    db_connected = False
    total_pdfs = 0
    try:
        db.execute(text("SELECT 1"))
        total_pdfs = db.query(PDFMetadata).count()
        db_connected = True
    except Exception:
        logger.exception("SQL database health check failed")
        db.rollback()

    # 3. check chroma and cnt collections
    chromadb_connected = False
    collection_count = 0

    try:
        client = chromadb.PersistentClient(
            path=str(settings.VECTOR_DB_DIR)
        )
        collection_count = len(client.list_collections())
        chromadb_connected = True
    except Exception:
        logger.exception("Chroma health check failed")

    # 4.  overall status
    healthy = (
        ollama_connected
        and db_connected
        and chromadb_connected
    )


    return HealthResponse(
        status="healthy" if healthy else "degraded",
        ollama_connected=ollama_connected,
        db_connected=db_connected,
        chromadb_connected=chromadb_connected,
        chromadb_collections=collection_count,
        total_pdfs=total_pdfs,
    )
