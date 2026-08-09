
import os
import requests
import base64

from typing import Optional
from pathlib import Path

from dotenv import load_dotenv


# ============================================================
# LOAD .ENV
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

load_dotenv(BASE_DIR / ".env")


# ============================================================
# LOGGER
# ============================================================

from app.core.logger import logger


# ============================================================
# SARVAM AI CLIENT
# ============================================================

class SarvamAIClient:

    def __init__(self):

        self.api_key = os.getenv("SARVAM_API_KEY")

        if not self.api_key:
            logger.warning(
                "SARVAM_API_KEY not found in environment variables."
            )
        else:
            logger.info(
                "Sarvam API key loaded successfully."
            )

        self.headers = {
            "api-subscription-key": self.api_key or "",
            "Content-Type": "application/json",
        }


    # ========================================================
    # LANGUAGE CODE FORMATTER
    # ========================================================

    def _format_language_code(
        self,
        lang_code: str
    ) -> str:

        if not lang_code:
            return "en-IN"

        lang_code = lang_code.strip()

        language_map = {
            "en": "en-IN",
            "en-in": "en-IN",

            "hi": "hi-IN",
            "hi-in": "hi-IN",

            "kn": "kn-IN",
            "kn-in": "kn-IN",

            "ta": "ta-IN",
            "ta-in": "ta-IN",

            "te": "te-IN",
            "te-in": "te-IN",

            "ml": "ml-IN",
            "ml-in": "ml-IN",

            "mr": "mr-IN",
            "mr-in": "mr-IN",

            "gu": "gu-IN",
            "gu-in": "gu-IN",

            "pa": "pa-IN",
            "pa-in": "pa-IN",

            "bn": "bn-IN",
            "bn-in": "bn-IN",

            "od": "od-IN",
            "od-in": "od-IN",
        }

        return language_map.get(
            lang_code.lower(),
            lang_code
        )


    # ========================================================
    # TEXT TRANSLATION
    # ========================================================

    def translate(
        self,
        text: str,
        source_lang: str,
        target_lang: str = "en-IN",
    ) -> Optional[str]:

        if not text:
            return None

        try:

            source_lang = self._format_language_code(
                source_lang
            )

            target_lang = self._format_language_code(
                target_lang
            )

            endpoint = (
                "https://api.sarvam.ai/"
                "translate"
            )

            payload = {
                "input": text,
                "source_language_code": source_lang,
                "target_language_code": target_lang,
            }

            response = requests.post(
                endpoint,
                headers=self.headers,
                json=payload,
                timeout=30,
            )

            response.raise_for_status()

            result = response.json()

            translated_text = result.get(
                "translated_text"
            )

            if translated_text:

                logger.info(
                    "Sarvam translation successful."
                )

                return translated_text

            logger.warning(
                "Sarvam translation returned no text."
            )

            return None

        except Exception as error:

            logger.error(
                f"Sarvam translation error: {error}"
            )

            return None


    # ========================================================
    # SPEECH TO TEXT
    # ========================================================

    def speech_to_text(
        self,
        audio_file_path: str,
        language_code: str,
    ) -> Optional[str]:

        if not audio_file_path:
            return None

        try:

            language_code = self._format_language_code(
                language_code
            )

            endpoint = (
                "https://api.sarvam.ai/"
                "speech-to-text"
            )

            logger.info(
                f"Attempting primary audio transcription "
                f"via Sarvam AI ({language_code})..."
            )

            with open(
                audio_file_path,
                "rb"
            ) as audio_file:

                files = {
                    "file": (
                        os.path.basename(audio_file_path),
                        audio_file,
                        "audio/webm",
                    )
                }

                data = {
                    "language_code": language_code,
                }

                response = requests.post(
                    endpoint,
                    headers={
                        "api-subscription-key":
                            self.api_key or ""
                    },
                    files=files,
                    data=data,
                    timeout=60,
                )

            response.raise_for_status()

            result = response.json()

            transcript = result.get(
                "transcript"
            )

            if transcript:

                logger.info(
                    "Sarvam AI audio transcription successful."
                )

                return transcript.strip()

            logger.warning(
                "Sarvam STT returned no transcript."
            )

            return None

        except Exception as error:

            logger.error(
                f"Sarvam STT API error: {error}"
            )

            return None


    # ========================================================
    # TEXT TO SPEECH
    # ========================================================

    def text_to_speech(
        self,
        text: str,
        language_code: str,
    ) -> Optional[str]:

        if not text:
            logger.warning(
                "TTS called with empty text."
            )
            return None

        try:

            lang = self._format_language_code(
                language_code
            )

            endpoint = (
                "https://api.sarvam.ai/"
                "text-to-speech"
            )

            logger.info(
                f"Generating Sarvam TTS for language: {lang}"
            )

            # ------------------------------------------------
            # IMPORTANT:
            # Current Sarvam API uses "text", NOT "inputs".
            # ------------------------------------------------

            payload = {
                "text": text[:1500],
                "target_language_code": lang,

                # Valid Bulbul v2 speaker
                "speaker": "anushka",

                "pace": 1.0,

                # Supported by Bulbul v2
                "pitch": 0.0,
                "loudness": 1.0,

                "speech_sample_rate": 22050,

                "model": "bulbul:v2",
            }

            logger.info(
                f"Sarvam TTS payload prepared for {lang}."
            )

            response = requests.post(
                endpoint,
                headers=self.headers,
                json=payload,
                timeout=60,
            )

            # ------------------------------------------------
            # Helpful debugging for API errors
            # ------------------------------------------------

            if not response.ok:

                logger.error(
                    "Sarvam TTS request failed."
                )

                logger.error(
                    f"Status code: {response.status_code}"
                )

                logger.error(
                    f"Response body: {response.text}"
                )

                response.raise_for_status()

            result = response.json()

            logger.info(
                f"Sarvam TTS response received: "
                f"{result.keys()}"
            )

            audios = result.get(
                "audios"
            )

            if not audios:

                logger.warning(
                    "Sarvam TTS response contains "
                    "no audios field."
                )

                return None

            audio_content = audios[0]

            if not audio_content:

                logger.warning(
                    "Sarvam TTS returned empty audio."
                )

                return None

            logger.info(
                "Sarvam TTS generated successfully "
                f"for {lang}."
            )

            logger.info(
                f"Base64 audio length: "
                f"{len(audio_content)}"
            )

            return audio_content

        except requests.exceptions.HTTPError as error:

            logger.error(
                f"Sarvam TTS HTTP error: {error}"
            )

            return None

        except Exception as error:

            logger.error(
                f"Sarvam TTS API error: {error}"
            )

            return None


# ============================================================
# SINGLETON INSTANCE
# ============================================================

sarvam_client = SarvamAIClient()

