"""Endpoints that list available Ollama chat models."""

import logging
from typing import List

import ollama
from fastapi import APIRouter, HTTPException

from backend.models import ModelInfo

router = APIRouter(
    prefix="/api/v1/models",
    tags=["models"]
)
logger = logging.getLogger(__name__)


def is_chat_model(model_name: str, model_size: int) -> bool:
    """Filter out embedding-only models and keep chat-capable ones."""
    SIZE_THRESHOLD = 1_000_000_000
    if model_size < SIZE_THRESHOLD:
        logger.info("Model '%s' is small (%s bytes), likely not a chat model", model_name, model_size)
        return False

    try:
        model_info = ollama.show(model_name)
        if hasattr(model_info, "template"):
            template = model_info.template if isinstance(model_info.template, str) else ""
            if template:
                return True

        if hasattr(model_info, "modelfile"):
            modelfile = model_info.modelfile if isinstance(model_info.modelfile, str) else ""
            if "embed" in modelfile.lower():
                return False
    except Exception as exc:  # pragma: no cover - environment dependent
        logger.debug("Could not inspect model details for %s: %s", model_name, exc)

    emb_indicators = ["embed", "embedding", "bge", "e5", "sentence", "mpnet", "minilm", "retrieval"]
    model_lower = model_name.lower()
    for indicator in emb_indicators:
        if indicator in model_lower:
            return False

    return True


@router.get("", response_model=List[ModelInfo])
def list_models():
    """Return all available chat models from Ollama."""
    try:
        models_info = ollama.list()
        chat_models = []

        for model in models_info.models:
            model_dict = model.model_dump()
            model_name = model_dict.get("model", "")
            model_size = model_dict.get("size", 0)

            if is_chat_model(model_name, model_size):
                chat_models.append(
                    ModelInfo(
                        name=model_name,
                        size=model_size,
                        modified_at=str(model_dict.get("modified_at", "")),
                    )
                )

        if not chat_models:
            raise HTTPException(
                status_code=404,
                detail="No chat models found. Please install one with: ollama pull llama3.2",
            )

        return chat_models
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to fetch models: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(exc)}")
