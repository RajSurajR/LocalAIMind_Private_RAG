"""RAG service layer.

This is the core of the question-answer flow.
It fetches relevant chunks from
PDF vector stores, builds a context string, and asks Ollama to answer using only
that retrieved context.
"""

from datetime import datetime
from typing import Dict, List, Optional, Tuple

import ollama
from langchain_classic.retrievers.multi_query import MultiQueryRetriever
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
from langchain_ollama import ChatOllama, OllamaEmbeddings
from sqlalchemy.orm import Session

from backend.config import settings
from backend.core.llm import LLMManager
from backend.core.rag import RAGPipeline
from backend.database import ChatMessage, ChatSession, PDFMetadata


class RAGService:
    """Service for PDF question-answering and session storage."""

    def __init__(self):
        self.persist_directory = settings.VECTOR_DB_DIR

    def query_multi_pdf(self, question: str, model: str,pdf_ids: Optional[List[str]], db: Session,
                        ) -> Tuple[str, List[Dict], List[str]]:
        """Search across PDFs and answer a question with source attribution."""
        reasoning_steps: List[str] = []

        query = db.query(PDFMetadata)
        if pdf_ids:
            query = query.filter(PDFMetadata.pdf_id.in_(pdf_ids))
        pdfs = query.all()

        if not pdfs:
            return "No PDFs found to query.", [], []

        reasoning_steps.append(f"Searching across {len(pdfs)} PDF(s): {', '.join(p.name for p in pdfs)}")

        llm_manager = LLMManager(model_name=model)
        rag_pipeline = RAGPipeline(llm_manager=llm_manager)
        reasoning_steps.append(f"Using model: {model}")

        query_prompt = llm_manager.get_query_prompt()

        all_docs = []
        embeddings = OllamaEmbeddings(model=settings.EMBEDDING_MODEL)

        for pdf in pdfs:
            from langchain_community.vectorstores import Chroma

            vector_db = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=embeddings,
                collection_name=pdf.collection_name,
            )

            retriever = MultiQueryRetriever.from_llm(
                vector_db.as_retriever(search_kwargs={"k": 3}),
                llm_manager.llm,
                prompt=query_prompt,
            )

            try:
                reasoning_steps.append(f"Retrieving from: {pdf.name}")
                docs = retriever.invoke(question)
                for doc in docs:
                    doc.metadata.setdefault("pdf_name", pdf.name)
                    doc.metadata.setdefault("pdf_id", pdf.pdf_id)
                all_docs.extend(docs)
                reasoning_steps.append(f"Found {len(docs)} relevant chunks in {pdf.name}")
            except Exception as exc:
                reasoning_steps.append(f"Warning retrieving from {pdf.name}: {str(exc)}")
                print(f"Error retrieving from {pdf.name}: {exc}")

        if not all_docs:
            return "No relevant document chunks found for this question.", [], reasoning_steps

        context_parts = []
        for doc in all_docs[:10]:
            source = doc.metadata.get("pdf_name", "Unknown")
            context_parts.append(f"[Source: {source}]\n{doc.page_content}\n")

        formatted_context = "\n---\n".join(context_parts)

        reasoning_steps.append("Generating answer with source citations...")

        if llm_manager.supports_thinking():
            reasoning_steps.append("Using thinking-capable model...")
            try:
                answer = rag_pipeline.get_thinking_response(question, formatted_context)
                if hasattr(ollama.chat, "__call__"):
                    pass
            except Exception as exc:
                print(f"Thinking mode failed, falling back to standard chain: {exc}")
                answer = rag_pipeline.get_response(question, formatted_context)
        else:
            answer = rag_pipeline.get_response(question, formatted_context)

        sources = [
            {
                "pdf_name": doc.metadata.get("pdf_name"),
                "pdf_id": doc.metadata.get("pdf_id"),
                "chunk_index": doc.metadata.get("chunk_index", 0),
            }
            for doc in all_docs[:10]
        ]

        reasoning_steps.append("Answer generated successfully!")
        return answer, sources, reasoning_steps

    def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        sources: Optional[List[Dict]],
        db: Session,
    ) -> ChatMessage:
        """Persist a user or assistant message in the chat session log."""
        session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
        if not session:
            session = ChatSession(
                session_id=session_id,
                created_at=datetime.now(),
                last_active=datetime.now(),
            )
            db.add(session)
        else:
            session.last_active = datetime.now()

        message = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            sources=sources,
            timestamp=datetime.now(),
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        return message

    def get_session_messages(self, session_id: str, db: Session) -> List[ChatMessage]:
        """Return all historical messages for a session."""
        return (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.timestamp)
            .all()
        )
