from pydantic import BaseModel
from typing import Dict, Any


class RouteDecision(BaseModel):

    intent: str

    route: str

    entities: Dict[str, Any]