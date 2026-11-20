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
  - Use: marks the folder as a Python package and allows imports such as `from backend...`.
  - What it does: keeps the backend organized as a reusable package rather than a loose script folder.

- `main.py`  
  - Use: application startup file.
  - Main functions: `root()`, and the app initialization with `FastAPI()`.
  - What it does: creates the API, enables CORS for the frontend, registers the routers for PDFs, queries, model listing, and health checks, and starts the server with Uvicorn.

- `config.py`  
  - Use: application settings file.
  - Main functions: `Settings` class and `settings` instance.
  - What it does: centralizes paths, database URL, vector DB directory, PDF upload folder, and default Ollama model values. This avoids hardcoding configuration in multiple files.

- `database.py`  
  - Use: persistence layer for SQLite.
  - Main functions: SQLAlchemy `engine`, `SessionLocal`, `Base`, and model classes `PDFMetadata`, `ChatSession`, and `ChatMessage`.
  - What it does: creates the local SQLite database, defines the tables for uploaded PDFs and chat history, and initializes the database schema when the backend starts.

- `models.py`  
  - Use: schema and validation layer for API requests/responses.
  - Main functions: request/response Pydantic models such as `QueryRequest`, `QueryResponse`, `PDFUploadResponse`, `SessionSummary`, and `HealthResponse`.
  - What it does: validates incoming request data and defines a consistent structure for the frontend to consume.

- `dependencies.py`  
  - Use: dependency injection layer for FastAPI.
  - Main functions: `get_db()`, `get_pdf_service()`, and `get_rag_service()`.
  - What it does: provides shared database sessions and service objects to each route without repeating boilerplate code.

- `README.md`  
  - Use: developer documentation.
  - What it does: explains the project structure, startup steps, API routes, and module responsibilities for new contributors.

#### backend/core/
This folder contains the reusable core RAG logic.

- `__init__.py`  
  - Use: package marker for the core module.
  - What it does: makes the core classes importable from the rest of the application.

- `document.py`  
  - Use: PDF extraction and chunk generation.
  - Main functions: `DocumentProcessor.__init__()`, `load_pdf()`, and `split_documents()`.
  - What it does: reads a PDF file, converts it into text documents, and splits large content into smaller chunks suitable for embedding and retrieval.

- `embeddings.py`  
  - Use: vector database creation and embedding storage.
  - Main functions: `VectorStore.__init__()`, `create_vector_db()`, and `delete_collection()`.
  - What it does: connects to the local Ollama embedding model, creates a persistent Chroma collection, and stores document chunks for semantic search.

- `llm.py`  
  - Use: LLM and prompt management.
  - Main functions: `LLMManager.__init__()`, `get_query_prompt()`, `get_rag_prompt()`, and `supports_thinking()`.
  - What it does: configures the Ollama chat model and creates prompt templates for query expansion and final answer generation.

- `rag.py`  
  - Use: end-to-end retrieval and answer generation pipeline.
  - Main functions: `RAGPipeline.__init__()`, `build_chain()`, `get_response()`, and `get_thinking_response()`.
  - What it does: combines vector retrieval and LLM response generation to answer a question with source-aware context.

#### backend/services/
This folder contains the business logic used by the API.

- `__init__.py`  
  - Use: package marker for the services module.
  - What it does: exposes the service package to the rest of the backend.

- `pdf_service.py`  
  - Use: PDF upload and indexing workflow.
  - Main functions: `PDFService.__init__()`, `upload_and_process()`, `list_all_pdfs()`, `get_pdf()`, `delete_pdf()`, and `_generate_pdf_id()`.
  - What it does: saves uploaded PDF files, reads and splits them into chunks, stores embeddings in Chroma, records metadata in SQLite, and removes PDF records when deleted.

- `rag_service.py`  
  - Use: core question-answering and session management logic.
  - Main functions: `query_multi_pdf()`, `save_message()`, `get_session_messages()`, `get_sessions()`, `rename_session()`, and `delete_session()`.
  - What it does: retrieves relevant chunks from the selected PDFs, builds context, uses the LLM to generate the answer, saves user and assistant messages, and manages chat sessions.

#### backend/routers/
These files define the HTTP endpoints exposed by the API.

- `__init__.py`  
  - Use: package marker for the router module.
  - What it does: allows the router package to be imported and grouped together.

- `pdfs.py`  
  - Use: API routes for PDF upload, listing, and deletion.
  - Main functions: `upload_pdf()`, `list_pdfs()`, and `delete_pdf()`.
  - What it does: receives uploaded PDF files from the frontend, validates them, processes them through `PDFService`, and exposes listing and deletion endpoints.

- `query.py`  
  - Use: chat question and session endpoints.
  - Main functions: `query_pdfs()`, `list_sessions()`, `get_session_messages()`, `rename_session()`, and `delete_session()`.
  - What it does: accepts a question from the user, saves the chat session, runs retrieval and answer generation, returns the final answer and sources, and handles session history operations.

- `models.py`  
  - Use: model listing endpoint.
  - Main functions: `is_chat_model()` and `list_models()`.
  - What it does: connects to Ollama, filters out embedding-only models, and returns only conversation-capable models available to the frontend.

- `health.py`  
  - Use: health and system status checks.
  - Main functions: `health_check()`.
  - What it does: verifies that Ollama is reachable, the SQLite database is connected, Chroma is available, and the vector/indexing system is healthy enough for normal operation.

## FastAPI API list

This backend is built with FastAPI and exposes the following routes:

| Method | Endpoint | What it does |
| --- | --- | --- |
| GET | `/` | Returns basic API information and links to docs and health. |
| GET | `/docs` | Swagger UI for interactive testing of the API. |
| GET | `/redoc` | Alternative ReDoc documentation view. |
| GET | `/api/v1/health` | Checks whether the backend and Ollama are running and reports storage statistics. |
| GET | `/api/v1/models` | Lists available Ollama chat models. |
| GET | `/api/v1/pdfs` | Lists every uploaded PDF and its metadata. |
| POST | `/api/v1/pdfs/upload` | Uploads a PDF file, indexes it, and stores it in the vector database. |
| DELETE | `/api/v1/pdfs/{pdf_id}` | Deletes a PDF file, its vector collection, and its database record. |
| POST | `/api/v1/query` | Sends a question and receives an answer based on the relevant PDF content. |
| GET | `/api/v1/sessions` | Returns all saved chat sessions with metadata like title, creation time, and last active time. |
| GET | `/api/v1/session/{session_id}/messages` | Returns the full conversation history for a chat session. |
| PUT | `/api/v1/session/{session_id}` | Renames an existing chat session. |
| DELETE | `/api/v1/session/{session_id}` | Deletes a chat session and all associated messages. |

### Route details

#### Health check
`GET /api/v1/health`

Used to verify that:
- the FastAPI app is running
- Ollama is reachable
- Chroma vector collections exist
- uploaded PDF records are being tracked in SQLite

#### Available models
`GET /api/v1/models`

Returns the Ollama chat models that are available for inference. This endpoint excludes embedding-only models.

#### PDF upload
`POST /api/v1/pdfs/upload`

Accepts a multipart PDF file and performs all indexing work:
1. file is saved to disk
2. PDF is read and split into chunks
3. chunks are embedded into Chroma
4. metadata is stored in SQLite

#### PDF listing
`GET /api/v1/pdfs`

Returns metadata such as:
- PDF ID
- file name
- vector collection name
- number of chunks
- page count
- upload date

#### PDF deletion
`DELETE /api/v1/pdfs/{pdf_id}`

Removes the file and vector collection to keep the local knowledge base clean.

#### Query / RAG
`POST /api/v1/query`

This is the main AI endpoint. The request body usually contains:

```json
{
  "question": "Summarize the document in simple terms",
  "model": "llama3.2",
  "pdf_ids": ["pdf_123"],
  "session_id": "session-01"
}
```

The backend then:
1. saves the user message
2. retrieves relevant chunks from the vector store
3. creates a context block for the LLM
4. asks Ollama to answer using only that retrieved context
5. saves the assistant response and sources
6. returns the answer to the client

#### Session list
`GET /api/v1/sessions`

Returns every saved chat session with summary information such as:
- session ID
- chat title
- creation timestamp
- last activity timestamp

This is used by the frontend sidebar to populate the session list.

#### Session history
`GET /api/v1/session/{session_id}/messages`

Returns prior conversation messages for a given session, including role, message content, and source metadata.

#### Rename session
`PUT /api/v1/session/{session_id}`

Updates the title of an existing session. The body is not a JSON object here; the current implementation accepts a plain `new_title` query parameter or string value supplied by the route handler, and rejects empty titles with a 400 error.

#### Delete session
`DELETE /api/v1/session/{session_id}`

Deletes the selected session and all related messages from SQLite.

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

## Run the FastAPI backend

From the project root, start the app with:

```bash
uvicorn backend.main:app --reload
```

Then open:
- http://localhost:8000/docs
- http://localhost:8000/redoc

The Swagger UI shows all FastAPI endpoints and lets you test them directly.
