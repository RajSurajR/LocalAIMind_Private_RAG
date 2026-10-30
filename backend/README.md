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
