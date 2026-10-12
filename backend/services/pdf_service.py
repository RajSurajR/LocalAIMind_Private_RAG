"""PDF upload and indexing service.

This is the part that turns an uploaded PDF into searchable chunks. The flow is:
1. save the file to disk
2. load the PDF as documents
3. split them into chunks
4. create a vector collection for the file
5. store metadata in SQLite
"""

import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import UploadFile
from sqlalchemy.orm import Session

from backend.config import settings
from backend.core.document import DocumentProcessor
from backend.core.embeddings import VectorStore
from backend.database import PDFMetadata


class PDFService:
    """Service for PDF upload, listing, and deletion."""

    def __init__(self):
        self.doc_processor = DocumentProcessor(chunk_size=7500, chunk_overlap=100)
        self.vector_store = VectorStore(
            embedding_model=settings.EMBEDDING_MODEL,
            persist_directory=settings.VECTOR_DB_DIR,
        )
        self.storage_dir = Path(settings.PDF_STORAGE_DIR)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    async def upload_and_process(self, file: UploadFile, db: Session) -> PDFMetadata:
        """Save a PDF, split it into chunks, index it, and record metadata."""
        pdf_id = self._generate_pdf_id(file.filename)

        file_path = self.storage_dir / f"{pdf_id}_{file.filename}"
        content = await file.read()
        with open(file_path, "wb") as file_handle:
            file_handle.write(content)

        documents = self.doc_processor.load_pdf(file_path)
        chunks = self.doc_processor.split_documents(documents)

        for index, chunk in enumerate(chunks):
            chunk.metadata.update({
                "pdf_id": pdf_id,
                "pdf_name": file.filename,
                "chunk_index": index,
                "source_file": file.filename,
            })

        collection_name = f"pdf_{abs(hash(file.filename + pdf_id))}"
        self.vector_store.create_vector_db(
            documents=chunks,
            collection_name=collection_name,
        )

        pdf_metadata = PDFMetadata(
            pdf_id=pdf_id,
            name=file.filename,
            collection_name=collection_name,
            upload_timestamp=datetime.now(),
            doc_count=len(chunks),
            page_count=len(documents),
            is_sample=False,
            file_path=str(file_path),
        )

        db.add(pdf_metadata)
        db.commit()
        db.refresh(pdf_metadata)
        return pdf_metadata

    def list_all_pdfs(self, db: Session) -> List[PDFMetadata]:
        """Return all uploaded PDFs and their metadata."""
        return db.query(PDFMetadata).all()

    def get_pdf(self, pdf_id: str, db: Session) -> Optional[PDFMetadata]:
        """Return a single PDF by its database identifier."""
        return db.query(PDFMetadata).filter(PDFMetadata.pdf_id == pdf_id).first()

    def delete_pdf(self, pdf_id: str, db: Session) -> bool:
        """Delete the PDF file, vector collection, and database row."""
        pdf = self.get_pdf(pdf_id, db)
        if not pdf:
            return False

        embeddings = self.vector_store.embeddings # get embedding model
        from langchain_community.vectorstores import Chroma

        vector_db = Chroma(
            persist_directory=settings.VECTOR_DB_DIR,
            embedding_function=embeddings,
            collection_name=pdf.collection_name,
        )
        vector_db.delete_collection()

        if pdf.file_path and os.path.exists(pdf.file_path):
            os.remove(pdf.file_path)

        db.delete(pdf)
        db.commit()
        return True

    def _generate_pdf_id(self, filename: str) -> str:
        """Create a deterministic-but-unique ID for a file upload."""
        timestamp = datetime.now().isoformat()
        return f"pdf_{abs(hash(filename + timestamp))}"
