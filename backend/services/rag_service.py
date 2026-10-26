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
from langchain_community.vectorstores import Chroma

from langchain_ollama import ChatOllama, OllamaEmbeddings
from sqlalchemy.orm import Session

from backend.config import settings
from backend.core.llm import LLMManager
from backend.core.rag import RAGPipeline
from backend.database import ChatMessage, ChatSession, PDFMetadata

import logging
logger = logging.getLogger(__name__)


class RAGService:
    """Service for PDF question-answering and session storage."""

    def __init__(self):
        self.persist_directory = settings.VECTOR_DB_DIR

    def query_multi_pdf(
        self, 
        question: str,
        model: str,
        pdf_ids: Optional[List[str]],
        db: Session,
    ) -> Tuple[str, List[Dict], List[str]]: # (gen_answer, list[src_dictionary], list[progress_msg])
        """
        Search across PDFs and answer a question with source attribution.
        """
        progress_steps: List[str] = []

        # 1. find pdf's in the sql db
        query = db.query(PDFMetadata)

        if pdf_ids:
            query = query.filter(PDFMetadata.pdf_id.in_(pdf_ids))
        pdfs = query.all()

        if not pdfs:
            return "No PDFs found to query.", [], []

        progress_steps.append(
            f"Searching across {len(pdfs)} PDF(s):"
            + ",".join(p.name for p in pdfs)
        )

        #2. initialize llm and rag pipline and embeddings
        try:
            llm_manager = LLMManager(model_name=model)
            rag_pipeline = RAGPipeline(llm_manager=llm_manager)
            embeddings = OllamaEmbeddings(model=settings.EMBEDDING_MODEL)

            query_prompt = llm_manager.get_query_prompt()
            progress_steps.append(f"Using model: {model}")
        except Exception:
            logger.exception("Failed to initialize the RAG pipeline")
            return (
                "Unable to initialize the question-answering system.",
                [],
                progress_steps,
            )


        #3. retrieve chunks from each pdfs
        # use prev : upload_and_prcoess() -> store embedding in respective collection
        all_docs = []
        failed_pdfs = []

        for pdf in pdfs:
            try:
                progress_steps.append(f"Retrieving from: {pdf.name}")

                vector_db = Chroma(
                    persist_directory=self.persist_directory,
                    embedding_function=embeddings,
                    collection_name=pdf.collection_name,
                )

                base_retriever = vector_db.as_retriever(
                    search_kwargs={"k":4}
                )
                # reterive req chunks from curr pdf a/c to query_prompt
                retriever = MultiQueryRetriever.from_llm(
                    retriever=base_retriever,
                    llm=llm_manager.llm,
                    prompt=query_prompt, # sturcture prompt : take question
                )

                # according to question retrive docs
                docs = retriever.invoke(question)

                for doc in docs:
                    doc.metadata.setdefault("pdf_name", pdf.name)
                    doc.metadata.setdefault("pdf_id", pdf.pdf_id)

                # store all docs
                all_docs.extend(docs)
                progress_steps.append(
                    f"Found {len(docs)} relevant chunks in {pdf.name}"
                )
            except Exception as exc:
                logger.exception(
                    "Retrieval failed for PDF %s (%s)",
                    pdf.name,
                    pdf.pdf_id,
                )
                failed_pdfs.append(pdf.name)
                progress_steps.append(f"Warning retrieving from {pdf.name}")

        if not all_docs:
            return (
                "No relevant document chunks could be retrieved.",
                [],
                progress_steps,
            )
        
        # 4. remove duplicate chunks.
        unique_docs = []
        seen_chunks = set()

        for doc in all_docs:
            pdf_id = doc.metadata.get("pdf_id")
            chunk_index = doc.metadata.get("chunk_index")

            # prefer stable chunk metadata; fall back to the text itself.
            if chunk_index is not None:
                key = (pdf_id, chunk_index)
            else:
                key = (pdf_id, doc.page_content)

            if key not in seen_chunks:
                seen_chunks.add(key)
                unique_docs.append(doc)

        #5. limit context size to avoid sending too much text to the llm
        max_chunks = 10
        max_context_chars = 20_000
        context_chars = 0

        selected_docs = []
        context_parts = []
        
        for doc in unique_docs:
            if len(selected_docs) >= max_chunks:
                break
            pdf_name = doc.metadata.get("pdf_name", "Unknown")
            page = doc.metadata.get("page")
            
            source_label = f"{pdf_name}"
            if page is not None:
                source_label += f", page {page}"
            part = f"[Source: {source_label}]\n{doc.page_content}\n"

            if context_chars + len(part) > max_context_chars:
                remaining = max_context_chars - context_chars
                if remaining <= 0:
                    break
                part = part[:remaining]

            context_parts.append(part)
            selected_docs.append(doc)
            context_chars += len(part)
            # source = doc.metadata.get("pdf_name", "Unknown")
            # context_parts.append(f"[Source: {source}]\n{doc.page_content}\n")

        if not context_parts:
            return (
                "No usable document text was found.",
                [],
                progress_steps,
            )
        
        # combine all context by separator in b/w
        formatted_context = "\n---\n".join(context_parts)

        #6. generate final answer
        progress_steps.append("Generating answer with source context...")

        try:
            if llm_manager.supports_thinking():
                try:
                    answer = rag_pipeline.get_thinking_response(question, formatted_context)
                except Exception as exc:
                    logger.exception(
                        "Thinking response failed; trying standard response"
                    )       
                    answer = rag_pipeline.get_response(question, formatted_context)
            else:
                answer = rag_pipeline.get_response(question, formatted_context)
        except Exception:
            logger.exception("Answer generation failed")
            progress_steps.append("Answer generation failed.")
            return (
                "Unable to generate an answer right now. Please try again.",
                [],
                progress_steps,
            )

        #7. return src for chunks include in the context.
        sources = [
            {
                "pdf_name": doc.metadata.get("pdf_name"),
                "pdf_id": doc.metadata.get("pdf_id"),
                "chunk_index": doc.metadata.get("chunk_index", 0),
                "page": doc.metadata.get("page"),
            }
            for doc in selected_docs
        ]

        if failed_pdfs:
            progress_steps.append(
                f"Retrieval failed for {len(failed_pdfs)} PDF(s)."
            )
            
        progress_steps.append("Answer generated successfully!")
        return answer, sources, progress_steps

    # save msg to sql db
    def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        sources: Optional[List[Dict]],
        db: Session,
    ) -> ChatMessage:
        """Save a chat message and update its session activity."""
        # find existing chat_session and add chatmessage
        try:
            now = datetime.now()
            session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
            if not session:
                title = content.strip() if content and content else "Chat Session"
                if len(title) > 32: 
                    title = f"{title[:29].strip()}..."

                session = ChatSession(
                    session_id=session_id,
                    title=title,
                    created_at=now,
                    last_active=now,
                )
                db.add(session)
            else:
                session.last_active = now

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
        except Exception:
            db.rollback()
            logger.exception(
                "failed to save chat message fro session %s",
                session_id,
            )
            raise

    def get_session_messages(self, session_id: str, db: Session) -> List[ChatMessage]:
        """Return all historical messages for a session."""
        return (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.timestamp)
            .all()
        )
    
    def get_sessions(self, db: Session) -> List[ChatSession]:
        """Return all chat sessions ordered by most recent activity."""
        return (
            db.query(ChatSession)
            .order_by(ChatSession.last_active.desc())
            .all()
        )
            

    def rename_session(self, session_id: str, new_title: str, db: Session) -> bool:
        """Rename a chat session."""
        try:
            session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
            if not session:
                return False
            session.title = new_title
            db.commit()
            return True
        except Exception:
            db.rollback()
            logger.exception(
                "failed to rename chat session %s",
                session_id,
            )
            raise
        
    def delete_session(self, session_id: str, db: Session) -> bool:
        """Delete a chat session and its messages."""
        try:
            session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
            if not session:
                return False
            db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
            db.delete(session)
            db.commit()
            return True
        except Exception:
            db.rollback()
            logger.exception(
                "failed to delete chat session %s",
                session_id,
            )
            raise
