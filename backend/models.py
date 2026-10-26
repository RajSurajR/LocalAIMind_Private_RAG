"""Pydantic schemas used by the API.

These models define what the API accepts and returns. They help FastAPI
validate input and make the output predictable for frontend clients.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from backend.config import settings
from pydantic import BaseModel


class PDFUploadResponse(BaseModel):
    pdf_id: str
    name: str
    collection_name: str
    doc_count: int
    page_count: int
    upload_timestamp: datetime


class PDFListItem(BaseModel):
    pdf_id: str
    name: str
    collection_name: str
    upload_timestamp: datetime
    doc_count: int
    page_count: int
    is_sample: bool


class QueryRequest(BaseModel):
    question: str
    model: str = settings.DEFAULT_CHAT_MODEL
    pdf_ids: Optional[List[str]] = None
    session_id: Optional[str] = None


class SourceInfo(BaseModel):
    pdf_name: str
    pdf_id: str
    chunk_index: int


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceInfo]
    metadata: Dict[str, Any]
    session_id: str
    message_id: int


class SessionSummary(BaseModel):
    session_id: str
    title: Optional[str] = None
    created_at: datetime
    last_active: datetime


class ModelInfo(BaseModel):
    name: str
    size: int
    modified_at: str


class HealthResponse(BaseModel):
    status: str
    ollama_connected: bool
    db_connected: bool
    chromadb_connected: bool
    chromadb_collections: int
    total_pdfs: int
