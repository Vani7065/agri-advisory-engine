import os
import io
import json
import asyncio
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification
from langchain_groq import ChatGroq

from app.core.config import settings
from app.api.routes import router
from app.core.logger import logger
from app.rag_engine import generate_rag_response 

# --- 1. ROUTING DIRECTLY TO YOUR ROOT VECTOR STORE ENGINE ---
import sys
from pathlib import Path as _Path
_BACKEND_ROOT = str(_Path(__file__).resolve().parent.parent)
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)
from vector_engine import retrieve_context 

# --- 2. ENV CONFIGURATION LAYER ---
CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
backend_env_path = BACKEND_DIR / ".env"

load_dotenv(dotenv_path=backend_env_path, override=True)

if os.getenv("GROQ_API_KEY"):
    logger.info("SUCCESS: Backend .env loaded! GROQ_API_KEY detected.")
else:
    logger.error(f"ERROR: Could not find GROQ_API_KEY at: {backend_env_path.resolve()}")

# --- 3. LAZY-LOAD HUGGINGFACE CROP DISEASE MODEL & PROCESSOR ---
disease_model = None
image_processor = None
MODEL_ID = "wambugu71/crop_leaf_diseases_vit"

# Actionable Agronomic Remedies Mapping
TREATMENTS = {
    "potato early blight": "Apply copper-based fungicides. Ensure proper spacing to improve air circulation.",
    "potato late blight": "Spray Mancozeb or Chlorothalonil immediately. Destroy infected plant debris.",
    "corn common rust": "Apply foliar fungicides if infection is severe. Plant resistant hybrids.",
    "corn gray leaf spot": "Use resistant hybrids and apply fungicides like strobilurins early.",
    "corn northern leaf blight": "Rotate crops and apply targeted foliar fungicides at early symptoms.",
    "rice brown spot": "Apply balanced fertilizers (potassium & silicon) and use certified disease-free seeds.",
    "rice leaf blast": "Maintain recommended water levels. Avoid excessive nitrogen fertilizer.",
    "tomato early blight": "Prune lower leaves and apply copper or chlorothalonil fungicides.",
    "tomato late blight": "Apply systemic fungicides promptly and remove affected foliage immediately."
}

def clean_disease_label(raw_label: str) -> str:
    """ 
    Formats raw labels like 'Potato___Early_blight' or 'potato_early_blight' 
    into 'Potato: Early Blight'
    """
    cleaned = raw_label.replace("___", " - ").replace("_", " ").title()
    if " - " in cleaned:
        parts = cleaned.split(" - ")
        return f"{parts[0]}: {parts[1]}"
    return cleaned


# --- 4. FASTAPI APP INITIALIZATION ---
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Multilingual NLP Processing & Computer Vision Engine for Farmer Advisory"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# --- 5. DATA SCHEMA RULES ---
class AdvisoryRequest(BaseModel):
    query: str
    language: str = "English"

# --- 6. ENDPOINT ROUTING LAYER ---

@app.post("/api/advisory", tags=["RAG Generation Engine"])
async def get_advisory(request: AdvisoryRequest):
    try:
        doc_objects = retrieve_context(query=request.query, k=3)
        real_context_chunks = [doc.page_content for doc in doc_objects]
        result = generate_rag_response(context=real_context_chunks, query=request.query)
        return result
    except Exception as e:
        logger.error(f"RAG Engine Execution Failure: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/diagnose", tags=["Crop Disease Computer Vision"])
async def diagnose_crop(
    file: UploadFile = File(...),
    language: str = "English"
):
    global disease_model, image_processor

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File uploaded must be an image format.")

    # Lazy-load the model if not already loaded
    if disease_model is None or image_processor is None:
        try:
            logger.info("Initializing Hugging Face Plant Disease Classification Pipeline (lazy load)...")
            image_processor = AutoImageProcessor.from_pretrained(MODEL_ID)
            disease_model = AutoModelForImageClassification.from_pretrained(MODEL_ID)
            disease_model.eval()
            logger.info("✅ Native Hugging Face Crop Disease Model & Labels loaded successfully!")
        except Exception as e:
            logger.error(f"❌ Critical error loading Hugging Face model: {str(e)}")
            raise HTTPException(
                status_code=503, 
                detail=f"Crop Disease Model could not be loaded: {str(e)}"
            )

    try:
        # 1. Read image bytes and convert to RGB
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # 2. Run inference on a separate thread using HuggingFace Processor
        def run_inference():
            inputs = image_processor(images=image, return_tensors="pt")
            with torch.no_grad():
                outputs = disease_model(**inputs)
                logits = outputs.logits
                probs = torch.nn.functional.softmax(logits[0], dim=0)
                confidence, predicted_idx = torch.max(probs, dim=0)
            
            raw_label = disease_model.config.id2label[predicted_idx.item()]
            return raw_label, round(confidence.item() * 100, 1)

        raw_label, confidence_pct = await asyncio.to_thread(run_inference)
        display_disease = clean_disease_label(raw_label)

        # Retrieve mapped remedy or default fallback
        raw_treatment = "Isolate affected plants and apply targeted organic or chemical fungicide recommended for your crop species."
        
        disease_lower = display_disease.lower()
        for key, remedy in TREATMENTS.items():
            if key in disease_lower:
                raw_treatment = remedy
                break
        display_treatment = raw_treatment

        # 3. Non-blocking Groq Translation
        if language.strip().lower() != "english" and os.getenv("GROQ_API_KEY"):
            try:
                def invoke_llm():
                    translator_llm = ChatGroq(
                        temperature=0.1, 
                        model_name="llama-3.3-70b-versatile"
                    )
                    translation_prompt = f"""
                    You are a professional agricultural advisor and translator. 
                    Translate the following crop disease name and treatment plan into clear, simple {language} tailored for a local farmer.

                    Disease Name: {display_disease}
                    Treatment Advice: {raw_treatment}

                    CRITICAL INSTRUCTION: Return ONLY a valid JSON object matching this structure:
                    {{"disease": "translated disease name", "treatment": "translated treatment advice"}}
                    Do not include any extra text, markdown formatting, or code fences outside the JSON object.
                    """
                    return translator_llm.invoke(translation_prompt)

                response = await asyncio.to_thread(invoke_llm)
                cleaned_str = response.content.strip().replace("```json", "").replace("```", "").strip()
                translated_data = json.loads(cleaned_str)

                display_disease = translated_data.get("disease", display_disease)
                display_treatment = translated_data.get("treatment", raw_treatment)

            except Exception as tr_err:
                logger.error(f"Translation to {language} failed; falling back to English: {str(tr_err)}")

        return {
            "disease": display_disease,
            "confidence": confidence_pct,
            "treatment": display_treatment,
            "is_healthy": "healthy" in display_disease.lower(),
            "language": language
        }

    except Exception as e:
        logger.error(f"Crop Diagnosis Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@app.get("/", tags=["Health Check"])
async def root_health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "active_milestone": "Milestone 1 Completed | Vision & Multilingual Engine Active"
    }

logger.info("FastAPI initialization sequence completed successfully.")
