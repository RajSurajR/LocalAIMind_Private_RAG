"""FastAPI application entry point.

This is the main startup file. It includes all routers and sets up CORS so the
frontend can request the backend while running on a different local port.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


# logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# fastapi initialize
app = FastAPI(
    title="LocalAIMind Private RAG API",
    description="FastAPI backend for PDF-based private RAG with Ollama",
    version="1.0.0",
)

# cors middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Basic status endpoint for the API."""
    return "backend running.."


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)
