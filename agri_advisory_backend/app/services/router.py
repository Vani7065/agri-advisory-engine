from app.services.nlp_engine import nlp_engine
from app.services.models import RouteDecision


class IntentRouter:

    ROUTES = {

        "CROP_ADVISORY": "RAG_PIPELINE",

        "MARKET_PRICES": "MANDI_API",

        "WEATHER_INFO": "WEATHER_API",

        "SCHEME_LOOKUP": "SCHEME_API"
    }

    def route_query(self, query: str):

        result = nlp_engine.process_query(query)

        intent = result["intent"]

        entities = result["entities"]

        route = self.ROUTES.get(intent, "UNKNOWN")

        return RouteDecision(

            intent=intent,

            route=route,

            entities=entities

        )


router = IntentRouter()