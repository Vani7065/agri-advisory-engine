from pydantic import BaseModel, Field


class ValidationResultModel(BaseModel):
    """Structured Pydantic model describing quality validation result of an LLM response."""

    is_valid: bool = Field(..., description="True if semantic similarity score >= 0.75, False otherwise")
    confidence_score: float = Field(..., description="Confidence score assigned to response (equals similarity score)")
    similarity_score: float = Field(..., description="Cosine similarity between response and context embeddings")
    fallback_triggered: bool = Field(..., description="True if fallback response is triggered due to low confidence or errors")
    review_required: bool = Field(..., description="True if low confidence response requires human review")
    final_response: str = Field(..., description="Validated original response or extension officer placeholder")
