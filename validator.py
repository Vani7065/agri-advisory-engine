"""Quality Control and Validation Service for AI Agricultural Advisory System.

Evaluates LLM generated advisory responses against retrieved RAG source contexts
using sentence transformers semantic embeddings and cosine similarity.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import List, Optional

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from app.models.validation_models import ValidationResultModel

# Module Logger Configuration
logger = logging.getLogger(__name__)

if not logger.handlers:
    logger.setLevel(logging.INFO)
    _console_handler = logging.StreamHandler()
    _formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
    _console_handler.setFormatter(_formatter)
    logger.addHandler(_console_handler)

# Constants
SIMILARITY_THRESHOLD: float = 0.75
FALLBACK_RESPONSE: str = "Connecting to agricultural extension officer..."
MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"

# Review log path inside this module folder: logs/review_logs.json
REVIEW_LOG_PATH: Path = Path(__file__).resolve().parent.parent.parent / "logs" / "review_logs.json"

# Cached model reference
_MODEL_INSTANCE: Optional[object] = None


def _ensure_review_log_file() -> None:
    """Create logs directory and review_logs.json if missing."""
    try:
        REVIEW_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        if not REVIEW_LOG_PATH.exists():
            REVIEW_LOG_PATH.write_text("[]", encoding="utf-8")
    except Exception as exc:
        logger.error("Failed writing review log entry: %s", exc)


def _load_model() -> object:
    """Lazily load and cache sentence-transformers model instance.

    Returns:
        SentenceTransformer model instance.

    Raises:
        RuntimeError: If model loading fails.
    """
    global _MODEL_INSTANCE
    if _MODEL_INSTANCE is not None:
        return _MODEL_INSTANCE

    try:
        from sentence_transformers import SentenceTransformer

        logger.info("Loading sentence transformer model: %s", MODEL_NAME)
        _MODEL_INSTANCE = SentenceTransformer(MODEL_NAME)
        logger.info("Model %s loaded successfully", MODEL_NAME)
        return _MODEL_INSTANCE
    except Exception as exc:
        logger.error("Failed to load sentence transformer model %s: %s", MODEL_NAME, exc)
        raise RuntimeError(f"Failed to load sentence-transformers model: {exc}") from exc


def _get_embedding(text: str) -> np.ndarray:
    """Generate normalized sentence embedding vector.

    Args:
        text (str): Input text string.

    Returns:
        np.ndarray: 1D normalized feature vector.
    """
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Text input must be a non-empty string")

    try:
        model = _load_model()
        embeddings = model.encode([text.strip()], convert_to_numpy=True, normalize_embeddings=True)
        return np.asarray(embeddings[0], dtype=np.float32)
    except Exception as exc:
        logger.error("Embedding generation failed for text: %s", exc)
        raise


def _get_average_context_embedding(contexts: List[str]) -> np.ndarray:
    """Average embedding vectors across all non-empty source contexts.

    Args:
        contexts (List[str]): Retrieved RAG contexts.

    Returns:
        np.ndarray: Averaged context embedding vector.
    """
    valid_contexts = [ctx.strip() for ctx in contexts if isinstance(ctx, str) and ctx.strip()]
    if not valid_contexts:
        raise ValueError("Context list must contain at least one non-empty string")

    context_vectors = [_get_embedding(ctx) for ctx in valid_contexts]
    stacked_vectors = np.stack(context_vectors, axis=0)
    return np.mean(stacked_vectors, axis=0)


def _log_review_entry(
    original_response: str,
    source_contexts: List[str],
    similarity: float,
    confidence: float,
    status: str,
) -> None:
    """Append low-confidence or failed validation event to logs/review_logs.json.

    Never overwrites previous logs.
    """
    _ensure_review_log_file()

    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "original_response": original_response,
        "source_contexts": source_contexts,
        "similarity": round(float(similarity), 4),
        "confidence": round(float(confidence), 4),
        "status": status,
    }

    try:
        try:
            with REVIEW_LOG_PATH.open("r", encoding="utf-8") as handle:
                existing_logs = json.load(handle)
                if not isinstance(existing_logs, list):
                    existing_logs = []
        except (json.JSONDecodeError, FileNotFoundError):
            existing_logs = []

        existing_logs.append(entry)

        with REVIEW_LOG_PATH.open("w", encoding="utf-8") as handle:
            json.dump(existing_logs, handle, indent=2, ensure_ascii=False)

        logger.info("Logged review entry with status '%s' to %s", status, REVIEW_LOG_PATH.name)
    except Exception as exc:
        logger.error("Failed writing review log entry: %s", exc)


def evaluate_response(response: str, source_contexts: List[str]) -> ValidationResultModel:
    """Evaluate LLM response quality against RAG context using semantic cosine similarity.

    Args:
        response (str): Generated response from LLM pipeline.
        source_contexts (List[str]): List of retrieved context strings.

    Returns:
        ValidationResultModel: Structured validation result object.
    """
    # 1. Input Validation: Check response
    if not isinstance(response, str) or not response.strip():
        logger.warning("Empty or invalid response provided to validator")
        _log_review_entry(
            original_response=response if isinstance(response, str) else "",
            source_contexts=source_contexts if isinstance(source_contexts, list) else [],
            similarity=0.0,
            confidence=0.0,
            status="empty_response",
        )
        return ValidationResultModel(
            is_valid=False,
            confidence_score=0.0,
            similarity_score=0.0,
            fallback_triggered=True,
            review_required=True,
            final_response=FALLBACK_RESPONSE,
        )

    # 2. Input Validation: Check source_contexts
    valid_contexts = (
        [ctx for ctx in source_contexts if isinstance(ctx, str) and ctx.strip()]
        if isinstance(source_contexts, list)
        else []
    )

    if not valid_contexts:
        logger.warning("Empty or invalid context list provided to validator")
        _log_review_entry(
            original_response=response.strip(),
            source_contexts=[],
            similarity=0.0,
            confidence=0.0,
            status="empty_context",
        )
        return ValidationResultModel(
            is_valid=False,
            confidence_score=0.0,
            similarity_score=0.0,
            fallback_triggered=True,
            review_required=True,
            final_response=FALLBACK_RESPONSE,
        )

    # 3. Calculate embeddings and cosine similarity
    try:
        response_vec = _get_embedding(response)
        avg_context_vec = _get_average_context_embedding(valid_contexts)

        sim_matrix = cosine_similarity([response_vec], [avg_context_vec])
        similarity_val = float(sim_matrix[0][0])
        # Clip numerical range safely to [0.0, 1.0]
        similarity_val = max(0.0, min(1.0, similarity_val))
        confidence_val = similarity_val

        # Rule evaluation
        if similarity_val >= SIMILARITY_THRESHOLD:
            logger.info("Validation succeeded with similarity %.4f", similarity_val)
            return ValidationResultModel(
                is_valid=True,
                confidence_score=confidence_val,
                similarity_score=similarity_val,
                fallback_triggered=False,
                review_required=False,
                final_response=response.strip(),
            )

        logger.warning(
            "Low similarity score (%.4f < %.2f). Triggering fallback.",
            similarity_val,
            SIMILARITY_THRESHOLD,
        )
        _log_review_entry(
            original_response=response.strip(),
            source_contexts=valid_contexts,
            similarity=similarity_val,
            confidence=confidence_val,
            status="low_confidence",
        )
        return ValidationResultModel(
            is_valid=False,
            confidence_score=confidence_val,
            similarity_score=similarity_val,
            fallback_triggered=True,
            review_required=True,
            final_response=FALLBACK_RESPONSE,
        )

    except Exception as exc:
        logger.error("Exception during evaluate_response processing: %s", exc)
        _log_review_entry(
            original_response=response.strip() if isinstance(response, str) else "",
            source_contexts=valid_contexts,
            similarity=0.0,
            confidence=0.0,
            status=f"error_{type(exc).__name__}",
        )
        return ValidationResultModel(
            is_valid=False,
            confidence_score=0.0,
            similarity_score=0.0,
            fallback_triggered=True,
            review_required=True,
            final_response=FALLBACK_RESPONSE,
        )


__all__ = ["evaluate_response", "ValidationResultModel", "FALLBACK_RESPONSE"]
