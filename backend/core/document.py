"""PDF loading and chunking utilities.

we convert a PDF into text chunks before indexing them into a vector store.
The chunking step is critical because a large PDF is rarely searched as one giant block;
retrieval works best with smaller, context-rich chunks.
contain:
1. consturctor store : chunk_size, chunk_overlap, text_splitter obj
2. load_pdf method :  file path => [load pdf get contains] => return list of docs
3. split_document : list of docs => [split document in chunks] => return list of text_chunks
"""

import logging
from pathlib import Path
from typing import List

from langchain_community.document_loaders import UnstructuredPDFLoader, PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Handle PDF reading and chunk splitting."""

    def __init__(self, chunk_size: int = 7500, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

    def load_pdf(self, file_path: Path) -> List:
        """Load a PDF file and return raw LangChain documents."""
        try:
            logger.info("Loading PDF from %s", file_path)
            loader = PyPDFLoader(str(file_path))
            return loader.load()
        except Exception as exc:
            logger.error("Error loading PDF: %s", exc)
            raise

    def split_documents(self, documents: List) -> List:
        """Split large PDF text into smaller chunks for retrieval."""
        try:
            logger.info("Splitting documents into chunks")
            return self.text_splitter.split_documents(documents)
        except Exception as exc:
            logger.error("Error splitting documents: %s", exc)
            raise
