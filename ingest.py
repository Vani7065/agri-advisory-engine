import os
import sys
import logging
from typing import List, Set
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from config import settings
from vector_engine import embeddings_model, CHROMA_PERSIST_DIR

# Setup logging configuration
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("Ingestor")

RAW_DOCS_DIR = settings.RAW_DOCS_DIR

def main() -> None:
    """
    Main document ingestion workflow. Scans, filters, splits, and loads PDF manuals
    from raw_documents/ into the persistent Chroma DB.
    """
    if not os.path.exists(RAW_DOCS_DIR):
        logger.info(f"Creating documents directory: {RAW_DOCS_DIR}")
        os.makedirs(RAW_DOCS_DIR, exist_ok=True)

    pdf_files = [f for f in os.listdir(RAW_DOCS_DIR) if f.lower().endswith(".pdf")]
    total_pdfs = len(pdf_files)
    logger.info(f"Scanning raw documents. Found {total_pdfs} PDF manuals in {RAW_DOCS_DIR}.")

    if total_pdfs == 0:
        logger.warning(f"No PDF manuals found in {RAW_DOCS_DIR}. Please place some PDF files there to ingest.")
        return

    # Load the persistent Chroma Vector DB
    logger.info(f"Connecting to Chroma database at '{CHROMA_PERSIST_DIR}'...")
    vector_store = Chroma(
        persist_directory=CHROMA_PERSIST_DIR,
        embedding_function=embeddings_model
    )
    
    # Track existing indexed files to prevent duplicate indexing
    existing_sources: Set[str] = set()
    try:
        existing_data = vector_store.get()
        if existing_data and "metadatas" in existing_data and existing_data["metadatas"]:
            for meta in existing_data["metadatas"]:
                if meta and "source" in meta:
                    existing_sources.add(meta["source"])
        logger.info(f"Found {len(existing_sources)} unique references already stored in vector database.")
    except Exception as err:
        logger.warning(f"Could not read existing database content (initializing new database): {err}")

    # Set up splitter matching existing configs
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )

    indexed_count = 0
    skipped_count = 0
    total_chunks_created = 0
    total_embeddings_stored = 0
    ocr_required_files: List[str] = []

    for idx, filename in enumerate(pdf_files, 1):
        file_path = os.path.join(RAW_DOCS_DIR, filename)

        # Check duplicate indexing by matching filename against stored sources
        is_duplicate = False
        for ex_src in existing_sources:
            # Match both relative paths or exact names
            if filename in ex_src or ex_src.endswith(filename):
                is_duplicate = True
                break

        if is_duplicate:
            logger.info(f"[{idx}/{total_pdfs}] SKIPPING (Already Indexed): {filename}")
            skipped_count += 1
            continue

        logger.info(f"[{idx}/{total_pdfs}] Processing manual: {filename}")
        
        # Load PDF pages
        try:
            loader = PyPDFLoader(file_path)
            pages = loader.load()
        except Exception as err:
            logger.error(f"[{idx}/{total_pdfs}] SKIPPED (Corrupted or Unreadable): {filename}. Error: {err}")
            skipped_count += 1
            continue

        if not pages:
            logger.warning(f"[{idx}/{total_pdfs}] SKIPPED (Empty PDF): {filename}")
            skipped_count += 1
            continue

        # Check for scanned PDF (lack of readable text characters)
        total_text_len = sum(len(p.page_content.strip()) for p in pages)
        if total_text_len < 150:
            logger.warning(
                f"[{idx}/{total_pdfs}] SKIPPED (OCR Required): '{filename}' "
                f"contains no readable digital text (Extracted: {total_text_len} chars)."
            )
            ocr_required_files.append(filename)
            skipped_count += 1
            continue

        # Split pages into semantic chunks
        chunks = text_splitter.split_documents(pages)
        if not chunks:
            logger.warning(f"[{idx}/{total_pdfs}] SKIPPED (No text chunks generated): {filename}")
            skipped_count += 1
            continue

        # Enrich metadata structure
        prepared_docs = []
        chunk_ids = []
        for c_idx, chunk in enumerate(chunks):
            page = chunk.metadata.get("page", 0)
            
            # Enrich metadata
            chunk.metadata["filename"] = filename
            chunk.metadata["source"] = file_path
            
            # Generate unique chunk ID
            chunk_id = f"{filename}_page_{page}_chunk_{c_idx}"
            chunk.metadata["chunk_id"] = chunk_id
            
            prepared_docs.append(chunk)
            chunk_ids.append(chunk_id)

        # Store embeddings in ChromaDB
        try:
            vector_store.add_documents(documents=prepared_docs, ids=chunk_ids)
            logger.info(f"[{idx}/{total_pdfs}] Successfully indexed: {filename} ({len(prepared_docs)} chunks)")
            indexed_count += 1
            total_chunks_created += len(prepared_docs)
            total_embeddings_stored += len(prepared_docs)
        except Exception as err:
            logger.error(f"[{idx}/{total_pdfs}] FAILED to save to database: {filename}. Error: {err}")
            skipped_count += 1

    # Print clean report
    print("\n" + "="*50)
    print("DOCUMENT INGESTION SUMMARY REPORT")
    print("="*50)
    print(f"Total PDFs found in raw folder:  {total_pdfs}")
    print(f"Number successfully indexed:     {indexed_count}")
    print(f"Number skipped / duplicates:     {skipped_count}")
    print(f"Total chunks created:            {total_chunks_created}")
    print(f"Total embeddings stored:         {total_embeddings_stored}")
    if ocr_required_files:
        print(f"Files requiring OCR ({len(ocr_required_files)}):")
        for f in ocr_required_files:
            print(f" - {f}")
    print("="*50)

if __name__ == "__main__":
    main()
