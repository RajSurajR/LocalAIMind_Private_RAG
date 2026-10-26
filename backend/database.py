"""Database models and SQLAlchemy engine setup.

SQLite is sufficient for local development. The metadata tables store uploaded
PDF information and chat history so the app can remember sessions and answer
queries with source attribution.
"""

from pathlib import Path

from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_DIR = Path(__file__).resolve().parent.parent / "data"
DATABASE_DIR.mkdir(parents=True, exist_ok=True)
DATABASE_URL = f"sqlite:///{DATABASE_DIR / 'localaimind.db'}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class PDFMetadata(Base):
    """Metadata for each uploaded PDF and its vector collection."""

    __tablename__ = "pdfs"

    pdf_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    collection_name = Column(String, unique=True, nullable=False)
    upload_timestamp = Column(DateTime, nullable=False)
    doc_count = Column(Integer, nullable=False)
    page_count = Column(Integer, nullable=False)
    is_sample = Column(Boolean, default=False)
    file_path = Column(String)


class ChatSession(Base):
    """One chat conversation session."""

    __tablename__ = "chat_sessions"
    session_id = Column(String, primary_key=True)
    title = Column(String, nullable=True, default="Chat Session")
    created_at = Column(DateTime, nullable=False)
    last_active = Column(DateTime, nullable=False)


class ChatMessage(Base):
    """A single user or assistant message in a chat session."""

    __tablename__ = "messages"

    message_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, nullable=False)
    role = Column(String, nullable=False)
    content = Column(String, nullable=False)
    sources = Column(JSON)
    timestamp = Column(DateTime, nullable=False)


Base.metadata.create_all(bind=engine)
