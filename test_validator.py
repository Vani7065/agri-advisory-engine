"""Unit tests for app.services.validator using Python unittest and mock embeddings."""

import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch
import numpy as np

# Ensure module root is in sys.path
module_root = Path(__file__).resolve().parent.parent
if str(module_root) not in sys.path:
    sys.path.insert(0, str(module_root))

from app.models.validation_models import ValidationResultModel
from app.services.validator import (
    FALLBACK_RESPONSE,
    REVIEW_LOG_PATH,
    SIMILARITY_THRESHOLD,
    evaluate_response,
)


class TestValidatorService(unittest.TestCase):
    """Independent unit tests for evaluate_response using deterministic mocked embeddings."""

    def setUp(self) -> None:
        """Ensure clean review log file in module logs directory before each test run."""
        REVIEW_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        REVIEW_LOG_PATH.write_text("[]", encoding="utf-8")

    @patch("app.services.validator._get_embedding")
    def test_valid_response(self, mock_get_embedding) -> None:
        """Test valid high-confidence response passing similarity threshold with mocked embeddings."""
        mock_get_embedding.return_value = np.array([1.0, 0.0, 0.0], dtype=np.float32)

        response = "Apply copper spray early morning to treat tomato leaf spot disease."
        contexts = [
            "Tomato leaf spot can be managed with copper fungicide sprays.",
            "Applying treatments in the early morning prevents leaf burning.",
        ]

        result = evaluate_response(response, contexts)

        self.assertIsInstance(result, ValidationResultModel)
        self.assertTrue(result.is_valid)
        self.assertFalse(result.fallback_triggered)
        self.assertFalse(result.review_required)
        self.assertGreaterEqual(result.similarity_score, SIMILARITY_THRESHOLD)
        self.assertEqual(result.confidence_score, result.similarity_score)
        self.assertEqual(result.final_response, response)

    @patch("app.services.validator._get_embedding")
    def test_invalid_response(self, mock_get_embedding) -> None:
        """Test low-similarity response triggering fallback with orthogonal mocked embeddings."""
        def embedding_side_effect(text):
            if "operating system" in text:
                return np.array([1.0, 0.0, 0.0], dtype=np.float32)
            return np.array([0.0, 1.0, 0.0], dtype=np.float32)

        mock_get_embedding.side_effect = embedding_side_effect

        response = "Install operating system software updates and reboot your desktop computer."
        contexts = [
            "Nitrogen fertilizer improves wheat yield during early growth stages.",
            "Soil testing helps determine precise fertilizer dosage for wheat.",
        ]

        result = evaluate_response(response, contexts)

        self.assertIsInstance(result, ValidationResultModel)
        self.assertFalse(result.is_valid)
        self.assertTrue(result.fallback_triggered)
        self.assertTrue(result.review_required)
        self.assertLess(result.similarity_score, SIMILARITY_THRESHOLD)
        self.assertEqual(result.final_response, FALLBACK_RESPONSE)

    def test_empty_response(self) -> None:
        """Test graceful handling of an empty response string."""
        result = evaluate_response("", ["Context about pest management"])

        self.assertIsInstance(result, ValidationResultModel)
        self.assertFalse(result.is_valid)
        self.assertTrue(result.fallback_triggered)
        self.assertTrue(result.review_required)
        self.assertEqual(result.final_response, FALLBACK_RESPONSE)
        self.assertEqual(result.confidence_score, 0.0)

    def test_empty_context_list(self) -> None:
        """Test graceful handling of an empty context list."""
        result = evaluate_response("Use drip irrigation for water efficiency.", [])

        self.assertIsInstance(result, ValidationResultModel)
        self.assertFalse(result.is_valid)
        self.assertTrue(result.fallback_triggered)
        self.assertTrue(result.review_required)
        self.assertEqual(result.final_response, FALLBACK_RESPONSE)
        self.assertEqual(result.confidence_score, 0.0)

    @patch("app.services.validator._get_embedding")
    def test_confidence_threshold(self, mock_get_embedding) -> None:
        """Test similarity score equals confidence score and threshold boundary behavior."""
        mock_get_embedding.return_value = np.array([0.8, 0.6, 0.0], dtype=np.float32)

        response = "Apply organic compost to enrich soil nutrients."
        contexts = ["Organic compost enhances soil organic matter and fertility."]

        result = evaluate_response(response, contexts)

        self.assertIsInstance(result, ValidationResultModel)
        self.assertEqual(result.confidence_score, result.similarity_score)
        self.assertEqual(result.is_valid, result.similarity_score >= SIMILARITY_THRESHOLD)

    @patch("app.services.validator._get_embedding")
    def test_fallback_trigger(self, mock_get_embedding) -> None:
        """Test that fallback response is returned when validation fails."""
        mock_get_embedding.side_effect = [
            np.array([1.0, 0.0, 0.0], dtype=np.float32),
            np.array([0.0, 1.0, 0.0], dtype=np.float32),
        ]

        result = evaluate_response("Unrelated response text", ["Agricultural context text"])

        self.assertIsInstance(result, ValidationResultModel)
        self.assertTrue(result.fallback_triggered)
        self.assertEqual(result.final_response, FALLBACK_RESPONSE)

    @patch("app.services.validator._get_embedding")
    def test_return_type_is_validation_result_model(self, mock_get_embedding) -> None:
        """Test that return value is always an instance of ValidationResultModel."""
        mock_get_embedding.return_value = np.array([1.0, 0.0, 0.0], dtype=np.float32)

        result = evaluate_response("Sample advice", ["Sample context"])
        self.assertIsInstance(result, ValidationResultModel)


if __name__ == "__main__":
    unittest.main()
