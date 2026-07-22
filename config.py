import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

# Get directory of this config file to resolve absolute paths
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, ".env")

class Settings(BaseSettings):
    PROJECT_NAME: str = "Standalone RAG Implementation"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Groq API Key required for RAG LLM
    GROQ_API_KEY: Optional[str] = Field(None, validation_alias="GROQ_API_KEY")
    
    # Vector store configurations resolved absolutely
    CHROMA_PERSIST_DIR: str = os.path.join(current_dir, "chroma_db_storage")
    RAW_DOCS_DIR: str = os.path.join(current_dir, "data", "raw_documents")

    # Read from local .env file relative to this script
    model_config = SettingsConfigDict(env_file=env_path, env_file_encoding="utf-8", extra="ignore")

settings = Settings()
