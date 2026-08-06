import os
import re
import json
import torch
from transformers import pipeline, AutoTokenizer, AutoModelForQuestionAnswering
from groq import Groq
from app.core.logger import logger
from app.core.config import settings


class AgriculturalNLPEngine:
    def __init__(self):
        # Initialize Groq if available
        self.groq_api_key = getattr(settings, "GROQ_API_KEY", None)
        if self.groq_api_key:
            logger.info("Groq API key detected. Initializing Groq cloud client for high-speed NLP.")
            self.groq_client = Groq(api_key=self.groq_api_key)
        else:
            self.groq_client = None
            logger.warning("No Groq API key found. Initializing Hugging Face local fallbacks...")

        # Updated candidate labels aligned with Intent Router specification
        self.candidate_labels = [
            "crop advisory", 
            "market prices", 
            "weather info", 
            "government scheme lookup", 
            "general inquiry"
        ]

        # --- Local Hugging Face models will be loaded lazily ---
        self.classifier = None
        self.qa_tokenizer = None
        self.qa_model = None
        self.qa_model_name = "deepset/roberta-base-squad2"

    def _get_classifier(self):
        """Lazy-loads the Zero-Shot Classifier when needed."""
        if self.classifier is None:
            try:
                logger.info("Initializing Hugging Face Zero-Shot Classifier (lazy load)...")
                self.classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
                logger.info("Local Hugging Face Zero-Shot Classifier loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load local zero-shot classification pipeline: {e}")
                self.classifier = None
        return self.classifier

    def _get_qa_model_and_tokenizer(self):
        """Lazy-loads the QA model and tokenizer when needed."""
        if self.qa_tokenizer is None or self.qa_model is None:
            try:
                logger.info("Initializing Hugging Face QA Model & Tokenizer (lazy load)...")
                self.qa_tokenizer = AutoTokenizer.from_pretrained(self.qa_model_name)
                self.qa_model = AutoModelForQuestionAnswering.from_pretrained(self.qa_model_name)
                logger.info("Local Hugging Face QA Model & Tokenizer loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load local QA model: {e}")
                self.qa_tokenizer = None
                self.qa_model = None
        return self.qa_tokenizer, self.qa_model

    def _extract_qa_answer(self, question: str, context: str) -> str:
        """Direct PyTorch tensor inference for extractive QA (replacing deprecated QA pipeline)."""
        tokenizer, model = self._get_qa_model_and_tokenizer()
        if not tokenizer or not model:
            return ""

        try:
            inputs = tokenizer(question, context, return_tensors="pt")
            with torch.no_grad():
                outputs = model(**inputs)

            answer_start = torch.argmax(outputs.start_logits)
            answer_end = torch.argmax(outputs.end_logits) + 1

            if answer_end <= answer_start:
                return ""

            answer = tokenizer.convert_tokens_to_string(
                tokenizer.convert_ids_to_tokens(inputs["input_ids"][0][answer_start:answer_end])
            )
            return answer.strip()
        except Exception as err:
            logger.error(f"Error during extractive QA inference: {err}")
            return ""

    def _fallback_keyword_extraction(self, text: str) -> dict:
        """Helper to pull basic entities via basic pattern matching if QA fails."""
        text_lower = text.lower()
        entities = {}
        
        crops = ["tomato", "rice", "wheat", "cotton", "maize", "onion", "potato"]
        for crop in crops:
            if crop in text_lower:
                entities["crop"] = crop
                break
                
        issues = ["pest", "bug", "insect", "rot", "blight", "fungus", "disease", "water", "flood"]
        for issue in issues:
            if issue in text_lower:
                entities["issue"] = issue
                break

        return entities

    def process_query(self, canonical_query: str) -> dict:
        """
        Dynamically extracts structural intent and entities from a query.
        Uses Groq LLM with exact schema contract, falling back to HF models if needed.
        """
        # --- PATH A: LIVE GROQ DATA EXTRACTION ---
        if self.groq_client:
            try:
                logger.info("Routing query extraction through Groq Cloud Engine...")
                
                system_instruction = (
                    "You are an expert agricultural NLP parsing system. Analyze the farmer's query and extract:\n"
                    "1. 'intent': Must be EXACTLY one of: 'CROP_ADVISORY', 'MARKET_PRICES', 'WEATHER_INFO', 'SCHEME_LOOKUP', or 'GENERAL_INQUIRY'.\n"
                    "2. 'entities': A clean flat JSON dictionary extracting properties such as 'crop', 'pest', 'disease', 'location', 'commodity', 'scheme', or 'issue'. Only include fields found in the user text.\n"
                    "Return ONLY a clean, valid JSON object matching this exact structure, with no conversational prose or markdown wrappers."
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
                
                if raw_content.startswith("```"):
                    raw_content = raw_content.replace("```json", "").replace("```", "").strip()
                    
                parsed_json = json.loads(raw_content)
                logger.info(f"Groq Intent & Entity Result: {parsed_json}")
                return parsed_json
                
            except Exception as groq_err:
                logger.error(f"Groq processing encountered an error: {groq_err}. Dropping to local HF pipelines.")

        # --- PATH B: OFFLINE HUGGING FACE SAFE FALLBACK ---
        logger.info("Executing local fallback processing pipeline...")
        intent = "GENERAL_INQUIRY"
        entities = {}
        
        # 1. Classification Fallback
        classifier = self._get_classifier()
        if classifier:
            try:
                classification = classifier(canonical_query, candidate_labels=self.candidate_labels)
                top_label = classification["labels"][0]
                
                intent_map = {
                    "crop advisory": "CROP_ADVISORY",
                    "market prices": "MARKET_PRICES",
                    "weather info": "WEATHER_INFO",
                    "government scheme lookup": "SCHEME_LOOKUP",
                    "general inquiry": "GENERAL_INQUIRY"
                }
                intent = intent_map.get(top_label, "GENERAL_INQUIRY")
            except Exception as hf_class_err:
                logger.error(f"HF classification calculation error: {hf_class_err}")

        # 2. Entity Extraction Fallback
        tokenizer, model = self._get_qa_model_and_tokenizer()
        if model and tokenizer:
            crop_ans = self._extract_qa_answer("What crop or plant?", canonical_query)
            if crop_ans and crop_ans != "<s>" and crop_ans != "</s>":
                entities["crop"] = crop_ans
                
            loc_ans = self._extract_qa_answer("What city, district, or state?", canonical_query)
            if loc_ans and loc_ans != "<s>" and loc_ans != "</s>":
                entities["location"] = loc_ans

            issue_ans = self._extract_qa_answer("What is the problem, pest, or infection?", canonical_query)
            if issue_ans and issue_ans != "<s>" and issue_ans != "</s>":
                entities["issue"] = issue_ans
        
        if not entities:
            entities.update(self._fallback_keyword_extraction(canonical_query))

        return {"intent": intent, "entities": entities}


# Global structural initialization singleton
nlp_engine = AgriculturalNLPEngine()