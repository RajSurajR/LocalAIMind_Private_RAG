"""Vector store wrapper for the local RAG pipeline.

This module creates a persistent Chroma vector database and stores chunks from
PDFs so we can later retrieve the most relevant passages during a question.
"""

import logging
from pathlib import Path
from typing import List

from langchain_community.vectorstores import Chroma
from langchain_ollama import OllamaEmbeddings

logger = logging.getLogger(__name__)


class VectorStore:
    """Manage embeddings and vector collection persistence."""

    def __init__(self, embedding_model: str = "nomic-embed-text", persist_directory: str = "data/vectors"):
        self.embeddings = OllamaEmbeddings(model=embedding_model)
        self.persist_directory = persist_directory
        self.vector_db = None
        Path(persist_directory).mkdir(parents=True, exist_ok=True)

    def create_vector_db(self, documents_chunks: List, collection_name: str = "local-rag") -> Chroma:
        """Create a persistent vector database from a list of document chunks."""
        try:
            logger.info("Creating vector database for collection=%s", collection_name)
            logger.info("Persist directory: %s", self.persist_directory)
            logger.info("Number of chunks: %s", len(documents_chunks))

            self.vector_db = Chroma.from_documents(
                documents=documents_chunks,
                embedding=self.embeddings,
                collection_name=collection_name,
                persist_directory=self.persist_directory,
            )

            logger.info("Vector database created successfully with %s documents", len(documents_chunks))
            return self.vector_db
        except Exception as exc:
            logger.error("Error creating vector database: %s", exc)
            raise

    def delete_collection(self) -> None:
        """Delete the stored collection from the vector database."""
        if not self.vector_db:
            return

        try:
            logger.info("Deleting vector database collection")
            self.vector_db.delete_collection()
            self.vector_db = None
        except Exception as exc:
            logger.error("Error deleting collection: %s", exc)
            raise
