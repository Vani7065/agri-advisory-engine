# Standalone RAG Implementation

This is a standalone repository containing the Retrieval-Augmented Generation (RAG) pipeline extracted from the original agricultural advisory system backend. It is designed to run independently for document ingestion and semantic query routing.

## Project Structure

```text
rag-implementation/
├── .env.example            # Environment variables template
├── .gitignore              # Files ignored by git
├── README.md               # Setup and usage guide
├── requirements.txt        # Minimal Python dependencies for RAG
├── config.py               # Settings loader using pydantic-settings
├── vector_engine.py        # Vector database setup and retrieval logic
├── ingest.py               # PDF document ingestion tool
├── main.py                 # FastAPI server routing queries to RAG orchestrator
└── rag/                    # Core RAG python package
    ├── __init__.py         # Package exports
    ├── orchestrator.py     # RAG workflow coordinator
    ├── retriever.py        # Semantic document retrieval wrapper
    ├── llm.py              # Cached ChatGroq model initializer
    ├── chains.py           # Advisory prompt LCEL chain builder
    ├── parser.py           # Document metadata and context parser
    └── prompts.py          # Strict advisory PromptTemplates
```

## Setup Instructions

### 1. Prerequisites
- Python 3.10 or higher
- A Groq API key (to invoke the LLM)

### 2. Install Dependencies
Create a virtual environment and install the required modules:
```bash
python -m venv .venv
# On Windows (PowerShell)
.venv\Scripts\Activate.ps1
# On Linux/macOS
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure the Environment
Copy `.env.example` to `.env` and fill in your Groq API key:
```bash
cp .env.example .env
```
Open `.env` and configure:
```env
GROQ_API_KEY=your_groq_api_key_here
```

## Usage

### 1. Document Ingestion
Place agricultural manuals (in PDF format) into the `data/raw_documents/` folder.
Run the ingestion script to process the manuals, generate embeddings, and build the persistent vector store:
```bash
python ingest.py
```
This splits documents into chunks and stores them in the `chroma_db_storage/` folder.

### 2. Start the API Server
Run the FastAPI application with Uvicorn:
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Query the Advisory API
Send a POST request to `/query` to ask a question. The API will retrieve relevant context from the indexed agricultural manuals and generate a response.

**Example Request:**
```bash
curl -X POST "http://127.0.0.1:8000/query" \
     -H "Content-Type: application/json" \
     -d '{"query": "How is rice cultivated?"}'
```

**Example Response:**
```json
{
  "answer": "Rice cultivation involves preparing the field, sowing seeds, transplanting seedlings, and maintaining water level...",
  "context_used": true,
  "sources": ["rice_cultivation.pdf"]
}
```
