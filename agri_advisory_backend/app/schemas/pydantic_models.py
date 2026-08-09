from typing import Optional, Dict, Any

from pydantic import BaseModel, Field


# ============================================================
# TEXT QUERY REQUEST
# ============================================================

class TextQueryRequest(BaseModel):
    session_id: str
    text: str
    preferred_language: Optional[str] = "auto"


# ============================================================
# API RESPONSE
# ============================================================

class APIResponseSchema(BaseModel):

    session_id: Optional[str] = None

    message_id: Optional[str] = None

    detected_language: Optional[str] = None

    canonical_query: Optional[str] = None

    inferred_intent: Optional[str] = None

    extracted_agricultural_entities: Dict[str, Any] = {}

    canonical_response: Optional[str] = None

    translated_response: Optional[str] = None

    audio: Optional[str] = None

    tts_language: Optional[str] = None