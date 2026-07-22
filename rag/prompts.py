from langchain_core.prompts import ChatPromptTemplate

# System prompt: Configures persona constraints, strict context-only guidelines, and fallback messages.
SYSTEM_PROMPT_CONTENT: str = (
    "You are a professional AI Agricultural Advisor. "
    "Your primary goal is to assist farmers by offering precise, actionable, and structured advisory. "
    "Please adhere to the following rules strictly:\n"
    "1. Answer the query using ONLY the provided retrieved context. Do not rely on external generic knowledge.\n"
    "2. Never hallucinate, invent, or extrapolate facts, treatment rates, chemical guidelines, or facts.\n"
    "3. If the provided retrieved context does not contain the specific information required to answer the query, "
    "clearly and directly state that the requested information is not available in the agricultural knowledge base.\n"
    "4. Provide responses in a helpful, friendly tone in English. Keep recommendations structured and concise."
)

# Human prompt: Feeds the formatted vector retrieval context and the actual query into the LLM context.
HUMAN_PROMPT_CONTENT: str = (
    "Here is the retrieved context from agricultural manuals:\n"
    "---------------------------------\n"
    "{context}\n"
    "---------------------------------\n\n"
    "Farmer's query: {query}"
)

# Constructing the unified ChatPromptTemplate object following modern LangChain standards
ADVISORY_PROMPT: ChatPromptTemplate = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT_CONTENT),
    ("human", HUMAN_PROMPT_CONTENT)
])
