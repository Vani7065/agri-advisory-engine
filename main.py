from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
from config import settings
from rag.orchestrator import RAGOrchestrator
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("RAG-API")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Standalone RAG API for Farmer Query Assistance"
)

# Enable CORS for cross-origin frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG Orchestrator singleton
rag_orchestrator = RAGOrchestrator()

class QueryRequest(BaseModel):
    query: str = Field(..., description="The query to ask the agricultural RAG advisor")

class QueryResponse(BaseModel):
    answer: str = Field(..., description="The generated response answer")
    context_used: bool = Field(..., description="Whether dynamic manual references were matched and used")
    sources: List[str] = Field(..., description="List of document manual filenames referenced")

@app.get("/", tags=["Health Check"])
async def root_health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

@app.post("/query", response_model=QueryResponse, tags=["RAG Inquiry"])
async def query_rag(payload: QueryRequest):
    """
    Process agricultural queries using RAG.
    """
    logger.info(f"Received query request: '{payload.query}'")
    try:
        response = rag_orchestrator.generate_rag_response(payload.query)
        return QueryResponse(
            answer=response["answer"],
            context_used=response["context_used"],
            sources=response["sources"]
        )
    except Exception as err:
        logger.error(f"Error executing RAG pipeline: {err}")
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred in the RAG execution layer: {str(err)}"
        )
