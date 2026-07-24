"""Runnable example showing Quality Control & Validation service usage."""

import sys
from pathlib import Path

# Ensure module root is in sys.path
module_root = Path(__file__).resolve().parent.parent
if str(module_root) not in sys.path:
    sys.path.insert(0, str(module_root))

from app.services.validator import evaluate_response


def main() -> None:
    """Run validator example with 1 generated response and 3 retrieved contexts."""
    # Generated LLM response
    generated_response = (
        "Apply copper-based fungicide or neem oil spray early in the morning "
        "to control fungal blight in tomato crops."
    )

    # Three retrieved RAG source contexts
    retrieved_contexts = [
        "Fungal blight affects tomato leaves and can be treated using copper-based fungicides.",
        "Organic remedies like neem oil sprays reduce fungal infection spread in vegetable crops.",
        "Foliar applications should be performed during early morning hours to prevent moisture retention.",
    ]

    # Perform evaluation
    result = evaluate_response(
        response=generated_response,
        source_contexts=retrieved_contexts,
    )

    # Print requested output fields
    print("=" * 60)
    print("AGRICULTURAL ADVISORY VALIDATION RESULT")
    print("=" * 60)
    print("Similarity Score  :", result.similarity_score)
    print("Confidence Score  :", result.confidence_score)
    print("Fallback Triggered:", result.fallback_triggered)
    print("Review Required   :", result.review_required)
    print("Final Response    :", result.final_response)
    print("=" * 60)


if __name__ == "__main__":
    main()
