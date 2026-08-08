import re
from app.services.intent_classifier import classify_intent


class AgriculturalNLPEngine:

    def __init__(self):
        self.crop_list = [
            "rice",
            "wheat",
            "tomato",
            "cotton",
            "maize",
            "onion",
            "potato",
            "banana",
            "groundnut",
            "sugarcane"
        ]

    def extract_entities(self, query):
        entities = {}
        query_lower = query.lower()

        # Crop extraction
        for crop in self.crop_list:
            if re.search(rf"\b{re.escape(crop)}\b", query_lower):
                entities["crop"] = crop
                break

        # Location extraction
        match = re.search(r"\bin\s+([A-Za-z ]+)", query)

        if match:
            location = match.group(1).strip()

            for word in ["today", "tomorrow", "yesterday"]:
                location = location.replace(word, "").strip()

            entities["location"] = location

        # Scheme extraction
        if "pm kisan" in query_lower:
            entities["scheme"] = "PM Kisan"

        # Issue extraction
        if "spot" in query_lower:
            entities["issue"] = "spots"
        elif "yellow" in query_lower:
            entities["issue"] = "yellow leaves"
        elif "worm" in query_lower:
            entities["issue"] = "worm"

        # Commodity extraction
        if "price" in query_lower and "crop" in entities:
            entities["commodity"] = entities["crop"]

        return entities

    def process_query(self, query):
        intent = classify_intent(query)
        entities = self.extract_entities(query)

        return {
            "intent": intent,
            "entities": entities
        }


nlp_engine = AgriculturalNLPEngine()