import logging
from typing import List
from langchain_core.documents import Document

# Initialize logging for the module
logger = logging.getLogger("RAGLogger")

def parse_documents(documents: List[Document]) -> str:
    """
    Parses a list of retrieved LangChain Document objects into a single context string.
    Extracts text content and appends cleaned source metadata references.

    Args:
        documents (List[Document]): The retrieved document chunks list.

    Returns:
        str: A single formatted text block of references.
    """
    if not documents:
        logger.warning("Empty document list provided for parsing context.")
        return "No manual reference context available."

    parsed_segments = []
    for idx, doc in enumerate(documents, start=1):
        # Extract base file source metadata
        raw_source = doc.metadata.get("source", "Unknown Source")
        clean_source = raw_source.replace("\\", "/").split("/")[-1]
        
        content_text = doc.page_content.strip()
        formatted_segment = f"[Manual Source {idx} - Reference: {clean_source}]\n{content_text}"
        parsed_segments.append(formatted_segment)

    return "\n\n".join(parsed_segments)
