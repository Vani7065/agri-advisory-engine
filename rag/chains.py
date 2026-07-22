import logging
from typing import Optional, Any
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableSerializable
from rag.prompts import ADVISORY_PROMPT
from rag.llm import get_llm

# Initialize logging for the module
logger = logging.getLogger("RAGLogger")

# Private module-level cache for the singleton chain instance
_rag_chain_instance: Optional[RunnableSerializable[dict[str, Any], str]] = None

def get_rag_chain() -> RunnableSerializable[dict[str, Any], str]:
    """
    Constructs and returns the cached singleton LangChain Expression Language (LCEL) chain.
    Components: ADVISORY_PROMPT | ChatGroq | StrOutputParser

    Returns:
        RunnableSerializable[dict[str, Any], str]: The compiled reusable LCEL chain.
    """
    global _rag_chain_instance

    # Return cached singleton instance if available
    if _rag_chain_instance is not None:
        logger.debug("Returning cached RAG advisory chain instance.")
        return _rag_chain_instance

    try:
        logger.info("Building the RAG advisory LCEL chain.")
        
        # 1. Retrieve the ChatGroq model instance (singleton)
        llm = get_llm()
        
        # 2. Instantiate the output parser
        output_parser = StrOutputParser()
        
        # 3. Build the pipeline using LCEL pipe operator (|)
        _rag_chain_instance = ADVISORY_PROMPT | llm | output_parser
        
        logger.info("RAG advisory LCEL chain successfully initialized.")
        return _rag_chain_instance
        
    except Exception as err:
        logger.error(f"Failed to build LangChain RAG advisory chain: {str(err)}")
        raise err
