"""Central configuration for the FastAPI backend.

This file keeps all environment-specific settings in one place so we can change
paths, database location, and the default Ollama model without touching the
business logic.
"""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables or a .env file."""

    PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent
    DATA_DIR: str = "data"
    PDF_STORAGE_DIR: str = "data/pdfs/uploads"
    VECTOR_DB_DIR: str = "data/vectors"
    DATABASE_URL: str = "sqlite:///./data/localaimind.db"

    OLLAMA_HOST: str = "http://localhost:11434"
    EMBEDDING_MODEL: str = "nomic-embed-text"
    DEFAULT_CHAT_MODEL: str = "llama3.2"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
