
import os
import shutil
from pydantic import BaseModel
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.pydantic_models import (
    TextQueryRequest,
    APIResponseSchema,
)
from app.services.state_manager import StateManager
from app.services.language_utils import detect_language
from app.services.sarvam_client import sarvam_client
from app.services.audio_processor import audio_processor
from app.services.nlp_engine import nlp_engine
from app.core.logger import logger
class FeedbackRequest(BaseModel):
    message_id: str
    feedback: str


class FeedbackResponse(BaseModel):
    success: bool
    message: str
    message_id: str
    feedback: str

router = APIRouter(
    prefix="/api/v1",
    tags=["Agricultural Advisory Engine"],
)
@router.post(
    "/feedback",
    response_model=FeedbackResponse,
)
async def submit_feedback(
    request: FeedbackRequest,
):
    logger.info("=================================")
    logger.info("📥 FEEDBACK REQUEST")
    logger.info(f"Message ID: {request.message_id}")
    logger.info(f"Feedback: {request.feedback}")
    logger.info("=================================")

    if not request.message_id:
        raise HTTPException(
            status_code=400,
            detail="Message ID is required.",
        )

    if request.feedback not in [
        "positive",
        "negative",
    ]:
        raise HTTPException(
            status_code=400,
            detail="Feedback must be positive or negative.",
        )

    logger.info(
        f"✅ Feedback accepted: "
        f"{request.feedback}"
    )

    return FeedbackResponse(
        success=True,
        message="Feedback submitted successfully.",
        message_id=request.message_id,
        feedback=request.feedback,
    )

# ============================================================
# CONFIGURATION
# ============================================================

TEMP_AUDIO_DIR = "temp_audio"

DEFAULT_LANGUAGE = "en-IN"

SESSION_ID_DEFAULT = "farmer_001"


# ============================================================
# FALLBACK KEYWORDS
# ============================================================

REGIONAL_TOMATO_KEYWORDS = [
    "टमाटर",
    "ಟೊಮೆಟೊ",
    "టమోటా",
    "தக்காளி",
    "തക്കാളി",
]


# ============================================================
# RESPONSE GENERATOR
# ============================================================

def generate_milestone1_advisory(
    intent: str,
    entities: dict,
) -> str:

    norm_entities = {
        str(k).strip().lower(): str(v).strip()
        for k, v in entities.items()
    }

    crop = norm_entities.get(
        "crop",
        norm_entities.get(
            "crop name",
            "specified crops",
        ),
    )

    disease = norm_entities.get(
        "disease",
        norm_entities.get(
            "issue",
            None,
        ),
    )

    pest = norm_entities.get(
        "pest",
        norm_entities.get(
            "bug",
            None,
        ),
    )

    location = norm_entities.get(
        "location",
        "your region",
    )

    cleaned_intent = str(intent).lower()

    # --------------------------------------------------------
    # PEST
    # --------------------------------------------------------

    if "pest" in cleaned_intent or pest:

        return (
            f"Regarding your inquiry about {crop} "
            f"in {location}: For controlling "
            f"{pest if pest else 'the observed pests'}, "
            f"inspect the underside of leaves and "
            f"consider appropriate neem-based treatment. "
            f"Follow local agricultural recommendations "
            f"before applying chemical pesticides."
        )

    # --------------------------------------------------------
    # DISEASE
    # --------------------------------------------------------

    if "disease" in cleaned_intent or disease:

        return (
            f"Regarding the {disease if disease else 'disease'} "
            f"affecting your {crop} in {location}: "
            f"Improve field drainage, avoid over-irrigation, "
            f"remove severely affected leaves, and consult "
            f"your local KVK for the appropriate fungicide "
            f"recommendation."
        )

    # --------------------------------------------------------
    # FERTILIZER
    # --------------------------------------------------------

    if (
        "fertilizer" in cleaned_intent
        or "nutrient" in cleaned_intent
    ):

        return (
            f"For your {crop} fertilizer requirement, "
            f"follow the recommended nutrient dose based "
            f"on your Soil Health Card. Avoid excessive "
            f"fertilizer application and apply nutrients "
            f"according to crop growth stage."
        )

    # --------------------------------------------------------
    # WEATHER
    # --------------------------------------------------------

    if "weather" in cleaned_intent:

        return (
            f"Weather information for {location}: "
            f"protect harvested crops from excessive "
            f"humidity and rain and maintain proper "
            f"drainage in the field."
        )

    # --------------------------------------------------------
    # MARKET
    # --------------------------------------------------------

    if "market" in cleaned_intent or "price" in cleaned_intent:

        return (
            f"Market-price information for {crop} "
            f"can vary by location and market. "
            f"Check the latest nearby mandi prices "
            f"before deciding where to sell."
        )

    # --------------------------------------------------------
    # GENERAL
    # --------------------------------------------------------

    return (
        f"Thank you for contacting the Agricultural "
        f"Advisory Desk regarding {crop}. "
        f"Your query has been categorized under "
        f"{intent}. Please provide more details about "
        f"the crop problem for a more specific advisory."
    )


# ============================================================
# TEXT QUERY
# ============================================================

@router.post(
    "/query/text",
    response_model=APIResponseSchema,
)
async def process_text_query(
    payload: TextQueryRequest,
    db: Session = Depends(get_db),
):

    session_id = payload.session_id
    raw_text = payload.text

    logger.info(
        f"Incoming text request for session: {session_id}"
    )

    # ========================================================
    # 1. LANGUAGE DETECTION
    # ========================================================

    detected_lang = detect_language(raw_text)

    if (
        payload.preferred_language
        and payload.preferred_language != "auto"
    ):
        detected_lang = payload.preferred_language

    logger.info(
        f"Detected language code: {detected_lang}"
    )

    # ========================================================
    # 2. DATABASE SESSION
    # ========================================================

    try:

        StateManager.get_or_create_session(
            db,
            session_id=session_id,
            preferred_lang=detected_lang,
        )

        StateManager.add_message_to_history(
            db,
            session_id=session_id,
            role="user",
            content=raw_text,
        )

    except Exception as db_error:

        logger.error(
            f"Database tracking error: {db_error}"
        )

    # ========================================================
    # 3. TRANSLATE TO ENGLISH
    # ========================================================

    canonical_query = raw_text

    if "en" not in detected_lang.lower():

        try:

            translated_input = sarvam_client.translate(
                text=raw_text,
                source_lang=detected_lang,
                target_lang="en-IN",
            )

            if translated_input:

                canonical_query = translated_input

                logger.info(
                    f"Canonical query: {canonical_query}"
                )

        except Exception as translation_error:

            logger.error(
                f"Input translation failed: "
                f"{translation_error}"
            )

    # ========================================================
    # 4. NLP PROCESSING
    # ========================================================

    intent = "general_inquiry"
    entities = {}

    try:

        if hasattr(
            nlp_engine,
            "process_query",
        ):

            result = nlp_engine.process_query(
                canonical_query
            )

            intent = result.get(
                "intent",
                "general_inquiry",
            )

            entities = result.get(
                "entities",
                {},
            )

        else:

            logger.warning(
                "nlp_engine.process_query() not available."
            )

    except Exception as nlp_error:

        logger.error(
            f"NLP processing failed: {nlp_error}"
        )

    logger.info(
        f"Detected intent: {intent}"
    )

    logger.info(
        f"Detected entities: {entities}"
    )

    # ========================================================
    # 5. UPDATE SESSION
    # ========================================================

    try:

        StateManager.update_context_and_preferences(
            db,
            session_id=session_id,
            new_context={
                "last_detected_intent": intent,
            },
            new_preferences=entities,
            detected_lang=detected_lang,
        )

    except Exception as context_error:

        logger.error(
            f"Context update failed: {context_error}"
        )

    # ========================================================
    # 6. GENERATE AI RESPONSE
    # ========================================================

    canonical_response = generate_milestone1_advisory(
        intent,
        entities,
    )

    # ========================================================
    # 7. TRANSLATE RESPONSE
    # ========================================================

    translated_response = canonical_response

    if "en" not in detected_lang.lower():

        try:

            translated_output = sarvam_client.translate(
                text=canonical_response,
                source_lang="en-IN",
                target_lang=detected_lang,
            )

            if translated_output:

                translated_response = translated_output

        except Exception as translation_error:

            logger.error(
                f"Response translation failed: "
                f"{translation_error}"
            )

    # ========================================================
    # 8. GENERATE TTS AUDIO
    # ========================================================

    audio_base64: Optional[str] = None

    try:

        logger.info(
            f"Generating TTS audio for language: "
            f"{detected_lang}"
        )

        audio_base64 = sarvam_client.text_to_speech(
            text=translated_response,
            language_code=detected_lang,
        )

        if audio_base64:

            logger.info(
                "TTS audio generated successfully."
            )

        else:

            logger.warning(
                "TTS returned no audio."
            )

    except Exception as tts_error:

        logger.error(
            f"TTS generation failed: {tts_error}"
        )

    # ========================================================
    # 9. SAVE ASSISTANT RESPONSE
    # ========================================================

    try:

        StateManager.add_message_to_history(
            db,
            session_id=session_id,
            role="assistant",
            content=translated_response,
        )

    except Exception as history_error:

        logger.error(
            f"Assistant history save failed: "
            f"{history_error}"
        )

    # ========================================================
    # 10. RETURN COMPLETE RESPONSE
    # ========================================================

    return APIResponseSchema(

        session_id=session_id,

        detected_language=detected_lang,

        canonical_query=canonical_query,

        inferred_intent=intent,

        extracted_agricultural_entities=entities,

        canonical_response=canonical_response,

        translated_response=translated_response,

        audio=audio_base64,

        tts_language=detected_lang,
    )


# ============================================================
# AUDIO QUERY
# ============================================================

@router.post(
    "/query/audio",
    response_model=APIResponseSchema,
)
async def process_audio_query(

    session_id: str = Form(
        SESSION_ID_DEFAULT
    ),

    language_code: str = Form(
        DEFAULT_LANGUAGE
    ),

    file: UploadFile = File(...),

    db: Session = Depends(get_db),
):

    logger.info(
        f"Incoming audio request for session "
        f"{session_id}, targeted language code: "
        f"{language_code}"
    )

    # ========================================================
    # 1. VALIDATE FILE
    # ========================================================

    if not file:

        raise HTTPException(
            status_code=400,
            detail="Audio file is required.",
        )

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="Audio filename is missing.",
        )

    # ========================================================
    # 2. CREATE TEMP DIRECTORY
    # ========================================================

    os.makedirs(
        TEMP_AUDIO_DIR,
        exist_ok=True,
    )

    safe_filename = os.path.basename(
        file.filename
    )

    temp_file_path = os.path.join(
        TEMP_AUDIO_DIR,
        safe_filename,
    )

    # ========================================================
    # 3. SAVE AUDIO
    # ========================================================

    try:

        with open(
            temp_file_path,
            "wb",
        ) as buffer:

            shutil.copyfileobj(
                file.file,
                buffer,
            )

        logger.info(
            f"Audio saved temporarily: "
            f"{temp_file_path}"
        )

    except Exception as file_error:

        logger.error(
            f"Failed to save audio: "
            f"{file_error}"
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to save uploaded audio.",
        )

    # ========================================================
    # 4. SPEECH TO TEXT
    # ========================================================

    transcribed_text = None

    try:

        transcribed_text = (
            audio_processor.transcribe_audio(
                file_path=temp_file_path,
                language_code=language_code,
            )
        )

        logger.info(
            f"Transcription result: "
            f"{transcribed_text}"
        )

    except Exception as audio_error:

        logger.error(
            f"Audio transcription failed: "
            f"{audio_error}"
        )

        raise HTTPException(
            status_code=422,
            detail="Unable to transcribe the audio.",
        )

    finally:

        # ====================================================
        # 5. DELETE TEMP FILE
        # ====================================================

        try:

            if os.path.exists(
                temp_file_path
            ):

                os.remove(
                    temp_file_path
                )

        except Exception as cleanup_error:

            logger.warning(
                f"Temporary audio cleanup failed: "
                f"{cleanup_error}"
            )

    # ========================================================
    # 6. CHECK TRANSCRIPTION
    # ========================================================

    if not transcribed_text:

        raise HTTPException(
            status_code=422,
            detail=(
                "Audio was received, but no speech "
                "could be recognized."
            ),
        )

    # ========================================================
    # 7. SEND TRANSCRIPT TO TEXT PIPELINE
    # ========================================================

    logger.info(
        "Sending transcribed voice text "
        "through main text pipeline."
    )

    request_payload = TextQueryRequest(

        session_id=session_id,

        text=transcribed_text,

        preferred_language=language_code,
    )

    # ========================================================
    # 8. TEXT PIPELINE ALSO GENERATES TTS
    # ========================================================

    return await process_text_query(
        payload=request_payload,
        db=db,
    )

