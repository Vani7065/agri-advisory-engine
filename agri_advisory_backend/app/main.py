from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import router
from app.core.logger import logger

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Multilingual NLP Processing Engine for Farmer Query Assistance (Milestone 1 Implementation)"
)

# Enable CORS for frontend applications or mobile integration environments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include our organized route logic mapping
app.include_router(router)

@app.get("/", tags=["Health Check"])
async def root_health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "active_milestone": "Milestone 1 (Weeks 1-2) Completed"
    }

logger.info("FastAPI initialization sequence completed successfully.")