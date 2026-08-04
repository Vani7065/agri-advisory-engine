import os
import requests
from typing import Optional
from groq import Groq
from app.core.config import settings
from app.core.logger import logger

class AudioProcessor:
    def __init__(self):
        self.sarvam_api_key = settings.SARVAM_API_KEY
        self.groq_api_key = settings.GROQ_API_KEY
        self.sarvam_url = "https://api.sarvam.ai/speech-to-text-translate"
        
        if self.groq_api_key:
            logger.info("Groq API key found. Hooking up Whisper-Cloud fallback driver for audio processing.")
            self.groq_client = Groq(api_key=self.groq_api_key)
        else:
            self.groq_client = None
            logger.warning("No Groq API key available for audio fallback processing.")

    def transcribe_audio(self, file_path: str, language_code: str = "hi-IN") -> str:
        """
        Transcribes regional audio using Sarvam AI with a seamless Groq Whisper fallback.
        """
        if language_code and len(language_code) == 2:
            language_code = f"{language_code}-IN"

        # --- PATH A: PRIMARY ENGINE (SARVAM AI) ---
        if self.sarvam_api_key:
            try:
                logger.info(f"Attempting primary audio transcription via Sarvam AI ({language_code})...")
                headers = {"api-subscription-key": self.sarvam_api_key}
                
                with open(file_path, "rb") as audio_file:
                    files = {"file": (os.path.basename(file_path), audio_file, "audio/wav")}
                    data = {
                        "model": "saaras:v2.5",  # <-- UPDATED TO THE LATEST VERSION TO FIX THE 400 DEPRECATION
                        "language_code": language_code
                    }
                    
                    response = requests.post(
                        self.sarvam_url, 
                        files=files, 
                        data=data, 
                        headers=headers, 
                        timeout=15
                    )
                
                if response.status_code == 200:
                    transcript = response.json().get("transcript", "").strip()
                    if transcript:
                        logger.info("Sarvam AI audio transcription successful.")
                        return transcript
                else:
                    logger.error(f"Sarvam STT returned status code {response.status_code}: {response.text}")
                    
            except Exception as e:
                logger.error(f"Sarvam primary STT engine error: {str(e)}")

        # --- PATH B: RESCUE BACKUP ENGINE (GROQ WHISPER CLOUD) ---
        if self.groq_client:
            try:
                logger.warning("Primary STT unavailable or failed. Routing audio stream to Groq Whisper Cloud...")
                
                # Normalize language string to 2 characters (e.g., 'ml-IN' -> 'ml')
                # Groq directly lists 'ml', 'hi', 'ta', 'te', 'kn' as accepted ISO tokens!
                whisper_lang = language_code.split("-")[0] if "-" in language_code else language_code
                
                with open(file_path, "rb") as audio_file:
                    response = self.groq_client.audio.transcriptions.create(
                        file=audio_file,
                        model="whisper-large-v3",
                        language=whisper_lang,  # <-- Pass clean 2-letter ISO string code directly
                        temperature=0.0
                    )
                
                if response.text:
                    logger.info("Successfully rescued audio pipeline processing using Groq Whisper.")
                    return response.text.strip()
                    
            except Exception as groq_err:
                logger.error(f"Groq Whisper fallback pipeline crashed: {groq_err}")

        raise RuntimeError("Both primary Sarvam and fallback Groq audio translation engines failed.")

# Singleton export matching your system architecture pattern
audio_processor = AudioProcessor()