"""Endpoints for asking questions against the uploaded PDFs."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import ChatMessage, ChatSession
from backend.dependencies import get_db, get_rag_service
from backend.models import QueryRequest, QueryResponse, SessionSummary, SourceInfo
from backend.services.rag_service import RAGService

router = APIRouter(
    prefix="/api/v1",
    tags=["query"]
)
logger = logging.getLogger(__name__)


# answer question endpoint
@router.post("/query", response_model=QueryResponse)
def query_pdfs(
    request: QueryRequest,
    db: Session = Depends(get_db),
    rag_service: RAGService = Depends(get_rag_service),
):
    """Submit a question and get an answer backed by relevant PDF chunks."""
    logger.info("Received query: %s", request.question[:60])

    session_id = request.session_id or str(uuid.uuid4())

    rag_service.save_message(
        session_id=session_id,
        role="user",
        content=request.question,
        sources=None,
        db=db,
    )

    try:
        answer, sources, reasoning_steps = rag_service.query_multi_pdf(
            question=request.question,
            model=request.model,
            pdf_ids=request.pdf_ids,
            db=db,
        )
    except Exception as exc:
        error_message = str(exc)
        if "not found" in error_message.lower() and "404" in error_message:
            raise HTTPException(
                status_code=404,
                detail=f"Model '{request.model}' not found. Install it with: ollama pull {request.model}",
            )
        raise HTTPException(status_code=500, detail=f"Query failed: {error_message}")

    message = rag_service.save_message(
        session_id=session_id,
        role="assistant",
        content=answer,
        sources=sources,
        db=db,
    )

    return QueryResponse(
        answer=answer,
        sources=[SourceInfo(**source) for source in sources],
        metadata={
            "model_used": request.model,
            "chunks_retrieved": len(sources),
            "pdfs_queried": len(set(source["pdf_id"] for source in sources if source.get("pdf_id"))),
            "reasoning_steps": reasoning_steps,
        },
        session_id=session_id,
        message_id=message.message_id,
    )

@router.get("/sessions", response_model=list[SessionSummary])
def list_sessions(
    db: Session = Depends(get_db),
    rag_service: RAGService = Depends(get_rag_service)
):
    """Return all persisted chat sessions."""
    sessions = rag_service.get_sessions(db)
    return [
        {
            "session_id": session.session_id,
            "title": session.title,
            "created_at": session.created_at,
            "last_active": session.last_active,
        }
        for session in sessions
    ]

@router.get("/session/{session_id}/messages")
def get_session_messages(
    session_id: str,
    db: Session = Depends(get_db),
    rag_service: RAGService = Depends(get_rag_service),
):
    """Return chat history for a given session."""
    messages = rag_service.get_session_messages(session_id, db)
    return [
        {
            "message_id": msg.message_id,
            "role": msg.role,
            "content": msg.content,
            "sources": msg.sources,
            "timestamp": msg.timestamp,
        }
        for msg in messages
    ]

@router.put("/session/{session_id}")
def rename_session(
    session_id: str,
    new_title: str,
    db: Session = Depends(get_db),
    rag_service: RAGService = Depends(get_rag_service),
):
    """Rename a chat session."""
    if not new_title.strip():
        raise HTTPException(status_code=400, detail="New title cannot be empty.")

    result = rag_service.rename_session(session_id, new_title.strip(), db)
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")

    return {"message": f"Session renamed to '{new_title.strip()}'."}

@router.delete("/session/{session_id}")
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    rag_service: RAGService = Depends(get_rag_service),
):
    """Delete a chat session and its associated messages."""
    result = rag_service.delete_session(session_id, db)
    if not result:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"message": f"Session and its messages have been deleted."}