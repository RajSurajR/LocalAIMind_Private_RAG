# LocalAIMind backend

This backend is the FastAPI layer for a private PDF-based RAG system. It handles:

- PDF upload and processing
- local vector indexing with Chroma
- retrieval of relevant passages
- Ollama-based answer generation
- SQLite chat history and metadata storage

The architecture is intentionally split into small modules so every file has one clear responsibility.

## Folder structure

### backend/
Main package for the API.

- `__init__.py`  
  Marks the backend directory as a Python package.

- `main.py`  
  Creates the FastAPI app, adds CORS, and registers all routers. This is the startup file for the server.

- `config.py`  
  Stores environment configuration such as model names, vector path, PDF storage path, and database URL.

- `database.py`  
  Creates the SQLite database and defines the database models: uploaded PDFs, chat sessions, and chat messages.

- `models.py`  
  Declares the request and response schemas used by FastAPI for validation and consistent API output.

- `dependencies.py`  
  Provides reusable dependency functions like database sessions and service instances for the route handlers.

- `README.md`  
  Explains the project structure and the purpose of each module.

#### backend/core/
This folder contains the reusable core RAG logic.

- `__init__.py`  
  Exposes the core RAG classes used by the service layer.

- `document.py`  
  Loads a PDF file and breaks the content into manageable text chunks. This prepares the raw content for vector storage and retrieval.

- `embeddings.py`  
  Wraps the embedding model and creates a persistent Chroma database. This stores document chunks as vectors for semantic search.

- `llm.py`  
  Defines `LLMManager`, which configures the Ollama chat model and keeps the prompt templates for query expansion and answer generation in one place.

- `rag.py`  
  Defines `RAGPipeline`, which connects retrieval and generation together to produce answers from the selected document chunks.

#### backend/services/
This folder contains the business logic used by the API.

- `__init__.py`  
  Marks the services package.

- `pdf_service.py`  
  Handles PDF upload, file saving, PDF parsing, chunk splitting, vector indexing, and PDF deletion.

- `rag_service.py`  
  Executes the actual RAG query workflow: retrieve relevant chunks, build the context, choose the model, generate an answer, and persist chat history.

#### backend/routers/
These files define the HTTP endpoints exposed by the API.

- `__init__.py`  
  Marks the routers package.

- `pdfs.py`  
  Exposes endpoints for uploading PDFs, listing uploaded PDFs, and deleting a PDF entry.

- `query.py`  
  Exposes the main question-answer endpoint and the session message history endpoint.

- `models.py`  
  Lists the available Ollama chat models to the frontend.

- `health.py`  
  Checks whether the backend and Ollama are reachable and reports some summary data about the system.

## Data flow

1. A PDF is uploaded to the API through the PDF route.
2. `PDFService.upload_and_process()` saves the file to disk and splits it into chunks.
3. `VectorStore` creates or updates the Chroma collection with embeddings for those chunks.
4. The user sends a question to the query route.
5. `RAGService.query_multi_pdf()` retrieves the most relevant chunks from the vector store.
6. The retrieved content is turned into context.
7. `LLMManager` and `RAGPipeline` construct the final prompt and ask Ollama to answer based only on the retrieved information.
8. The answer and source metadata are saved to SQLite along with the chat session.

## Why the structure is important

This split keeps responsibilities clean:

- `routers/` handles HTTP requests
- `services/` handles business logic
- `core/` handles the reusable RAG pipeline logic
- `database.py` handles persistence
- `config.py` handles environment settings

This makes the backend easier to extend, easier to debug, and easier to maintain as more features are added.
