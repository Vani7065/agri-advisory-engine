import logging
from typing import Dict, Any, List
from rag.retriever import retrieve_documents
from rag.parser import parse_documents
from rag.chains import get_rag_chain

# Initialize logging for the module
logger = logging.getLogger("RAGLogger")

class RAGOrchestrator:
    """
    Orchestrator class responsible for coordinating the RAG workflow pipeline.
    Retrieves documents, parses context, and invokes the LCEL chain.
    """

    def generate_rag_response(self, query: str) -> Dict[str, Any]:
        """
        Coordinates the RAG retrieval and response generation flow.

        Args:
            query (str): The canonical, English translated farmer query.

        Returns:
            Dict[str, Any]: A dictionary containing:
                - "answer" (str): The generated response text.
                - "context_used" (bool): Whether relevant documents were retrieved and used.
                - "sources" (List[str]): List of source filenames cited.
        """
        logger.info(f"RAGOrchestrator triggered for query: '{query}'")

        try:
            # 1. Retrieve relevant document chunks
            documents = retrieve_documents(query)
            
            if not documents:
                logger.info("No relevant documents retrieved. Using fallback behavior.")
                # Get the RAG chain
                chain = get_rag_chain()
                # Invoke the chain with empty context so the prompt's fallback logic triggers
                answer = chain.invoke({
                    "context": "",
                    "query": query
                })
                return {
                    "answer": answer,
                    "context_used": False,
                    "sources": []
                }

            # 2. Parse documents into a context string
            context = parse_documents(documents)
            
            # Extract unique source filenames from metadata
            sources = []
            for doc in documents:
                source_path = doc.metadata.get("source", "")
                if source_path:
                    # Extract only the filename from the path
                    filename = source_path.replace("\\", "/").split("/")[-1]
                    if filename not in sources:
                        sources.append(filename)

            # 3. Get compiled LCEL chain instance
            chain = get_rag_chain()

            # 4. Invoke the LCEL chain with retrieved context
            logger.info("Invoking LangChain LCEL chain with retrieved context.")
            answer = chain.invoke({
                "context": context,
                "query": query
            })

            return {
                "answer": answer,
                "context_used": True,
                "sources": sources
            }

        except Exception as err:
            logger.error(f"Error occurred during RAG response generation orchestration: {str(err)}")
            raise err
