import os
import sys
import logging
from typing import List
from langchain_core.documents import Document

# Initialize logger for the module
logger = logging.getLogger("RAGLogger")

# Dynamically add the parent project root to the python path to resolve vector_engine import
parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

try:
    from vector_engine import retrieve_context
except ImportError as err:
    logger.critical(f"RAG Retriever failed to import vector_engine from parent root: {str(err)}")
    raise err

def retrieve_documents(query: str, k: int = 3) -> List[Document]:
    """
    Wraps the existing vector_engine.retrieve_context() function to fetch documents.
    Safely retrieves the top-k most semantically similar documents matching the query.

    Args:
        query (str): The canonical query string to search for in vector database.
        k (int, optional): The number of document chunks to retrieve. Defaults to 3.

    Returns:
        List[Document]: A list of retrieved LangChain Document objects, returning an empty list on failure.
    """
    try:
        logger.info(f"Initiating vector document search. Query: '{query}', chunks limit (k): {k}")
        
        # Invoke root vector engine's similarity search
        documents: List[Document] = retrieve_context(query, k=k)
        
        logger.info(f"Vector search complete. Successfully retrieved {len(documents)} document chunk(s).")
        return documents
    except Exception as err:
        logger.error(f"Error occurred during vector store document retrieval: {str(err)}")
        # Graceful return to prevent crashing calling pipelines
        return []
