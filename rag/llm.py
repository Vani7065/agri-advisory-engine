import logging
from typing import Optional
from langchain_groq import ChatGroq
import os
import sys

# Initialize module logger
logger = logging.getLogger("RAGLogger")

# Dynamically add the parent directory to python path to resolve config import
parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from config import settings

# Private module-level cache for singleton LLM instance
_llm_instance: Optional[ChatGroq] = None

def get_llm() -> ChatGroq:
    """
    Returns a cached singleton instance of the ChatGroq LLM client.
    Initializes the client on the first invocation.

    Raises:
        ValueError: If GROQ_API_KEY is not configured in settings.

    Returns:
        ChatGroq: The configured ChatGroq client singleton.
    """
    global _llm_instance

    # If instance has already been initialized, return it immediately
    if _llm_instance is not None:
        logger.debug("Returning cached ChatGroq singleton instance.")
        return _llm_instance

    # Retrieve the API key dynamically from settings
    api_key: Optional[str] = settings.GROQ_API_KEY
    if not api_key or not api_key.strip():
        logger.error("Failed to initialize ChatGroq: GROQ_API_KEY is missing.")
        raise ValueError(
            "GROQ_API_KEY configuration is missing or empty. "
            "Please configure GROQ_API_KEY in your environmental variables or .env file."
        )

    try:
        logger.info("Initializing ChatGroq client with model 'llama-3.3-70b-versatile'.")
        # Initialize the ChatGroq model using the latest LangChain 0.3 APIs
        _llm_instance = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=api_key,
            temperature=0.2,
            max_tokens=1024,
        )
        return _llm_instance
    except Exception as err:
        logger.error(f"Failed to initialize ChatGroq client: {str(err)}")
        raise err
