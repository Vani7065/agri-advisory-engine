import os
import json
from transformers import pipeline
from groq import Groq
from app.core.logger import logger
from app.core.config import settings

class AgriculturalNLPEngine:
    def __init__(self):
        # Initialize Groq if available
        self.groq_api_key = settings.GROQ_API_KEY
        if self.groq_api_key:
            logger.info("Groq API key detected. Initializing Groq cloud client for high-speed NLP.")
            self.groq_client = Groq(api_key=self.groq_api_key)
        else:
            self.groq_client = None
            logger.warning("No Groq API key found. Initializing Hugging Face local fallbacks...")
            
        # Local Hugging Face models as local fail-safe structures
        self.candidate_labels = ["pest_control", "disease_management", "fertilizer_guidance", "weather_advisory", "general_inquiry"]
        try:
            self.classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
            self.ner_qa = pipeline("question-answering", model="deepset/roberta-base-squad2")
            logger.info("Local Hugging Face fail-safe pipelines initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to load local Hugging Face pipelines: {e}")
            self.classifier = None
            self.ner_qa = None

    def process_query(self, canonical_query: str) -> dict:
        """
        Dynamically extracts structural intent and entities from an English query.
        Uses Groq LLM if available, otherwise safely drops back to Hugging Face pipelines.
        """
        # --- PATH A: LIVE GROQ DATA EXTRACTION ---
        if self.groq_client:
            try:
                logger.info("Routing query extraction through Groq Cloud Engine...")
                
                system_instruction = (
                    "You are an expert agricultural NLP parsing system. Analyze the farmer's English query and extract: \n"
                    "1. 'intent': Must be exactly one of: 'pest_control', 'disease_management', 'fertilizer_guidance', 'weather_advisory', or 'general_inquiry'.\n"
                    "2. 'entities': A clean flat JSON dictionary extracting properties like 'crop', 'pest', 'disease', 'location', or 'issue'. Only include fields found in the text.\n"
                    "Return ONLY a clean, valid JSON object matching this exact structure, with no conversational prose or markdown codeblock wrappers."
                )

                response = self.groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": f"Query: {canonical_query}"}
                    ],
                    temperature=0.1,
                    max_tokens=250
                )
                
                raw_content = response.choices[0].message.content.strip()
                
                # Sanitize the output string if markdown syntax accidentally bled out
                if raw_content.startswith("```"):
                    raw_content = raw_content.replace("```json", "").replace("```", "").strip()
                    
                parsed_json = json.loads(raw_content)
                logger.info(f"Groq Extraction Result: {parsed_json}")
                return parsed_json
                
            except Exception as groq_err:
                logger.error(f"Groq processing encountered a runtime hurdle: {groq_err}. Dropping to local pipelines.")

        # --- PATH B: OFFLINE HUGGING FACE SAFE FALLBACK ---
        logger.info("Executing local fallback processing pipeline...")
        intent = "general_inquiry"
        entities = {}
        
        if self.classifier and self.ner_qa:
            try:
                classification = self.classifier(canonical_query, candidate_labels=self.candidate_labels)
                intent = classification["labels"][0]
                
                qa_crop = self.ner_qa(question="What crop or plant?", context=canonical_query)
                if qa_crop["score"] > 0.1:
                    entities["crop"] = qa_crop["answer"].strip()
                    
                qa_issue = self.ner_qa(question="What is the problem, pest, or infection?", context=canonical_query)
                if qa_issue["score"] > 0.1:
                    entities["issue"] = qa_issue["answer"].strip()
            except Exception as hf_err:
                logger.error(f"HF fallback model calculation exception: {hf_err}")
                
        return {"intent": intent, "entities": entities}

# Global structural initialization singleton
nlp_engine = AgriculturalNLPEngine()


