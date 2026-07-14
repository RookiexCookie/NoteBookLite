import os
import shutil
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from pdf_processor import extract_text_from_pdf
from rag_engine import (
    chunk_text,
    get_embeddings,
    create_vector_store,
    query_vector_store,
    generate_answer,
    generate_document_summary,
    generate_study_material,
    VECTOR_DIR
)

app = FastAPI(title="NotebookLite RAG Backend")

# Serve PDF uploads statically
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.on_event("startup")
def clean_on_startup():
    # Clean UPLOAD_DIR
    if os.path.exists(UPLOAD_DIR):
        for f in os.listdir(UPLOAD_DIR):
            path = os.path.join(UPLOAD_DIR, f)
            try:
                if os.path.isfile(path) or os.path.islink(path):
                    os.unlink(path)
                elif os.path.isdir(path):
                    shutil.rmtree(path)
            except Exception:
                pass
    # Clean VECTOR_DIR
    if os.path.exists(VECTOR_DIR):
        for f in os.listdir(VECTOR_DIR):
            path = os.path.join(VECTOR_DIR, f)
            try:
                if os.path.isfile(path) or os.path.islink(path):
                    os.unlink(path)
                elif os.path.isdir(path):
                    shutil.rmtree(path)
            except Exception:
                pass

def is_document_indexed(filename: str) -> bool:
    """
    Checks if a document has been successfully indexed (contains embeddings).
    """
    metadata_path = os.path.join(VECTOR_DIR, f"{filename}.json")
    if not os.path.exists(metadata_path):
        return False
    try:
        with open(metadata_path, "r") as f:
            import json
            data = json.load(f)
            if isinstance(data, list) and len(data) > 0:
                return "embedding" in data[0]
    except Exception:
        pass
    return False

# Helper: Load API Key from environment or request headers
def get_api_key(
    x_api_key: Optional[str] = Header(None),
    x_gemini_api_key: Optional[str] = Header(None)
) -> str:
    # 1. Check unified header
    if x_api_key and x_api_key.strip():
        return x_api_key.strip()
        
    # 2. Check legacy gemini header
    if x_gemini_api_key and x_gemini_api_key.strip():
        return x_gemini_api_key.strip()
    
    # 3. Check system environment
    env_key = os.environ.get("GEMINI_API_KEY")
    if env_key and env_key.strip():
        return env_key.strip()
    
    # 4. Try to read from local .env
    for env_path in [".env", "../.env"]:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r") as f:
                    for line in f:
                        if line.strip() and not line.strip().startswith("#"):
                            if "=" in line:
                                key, val = line.strip().split("=", 1)
                                if key.strip() == "GEMINI_API_KEY":
                                    return val.strip()
            except Exception:
                pass
                
    raise HTTPException(
        status_code=400, 
        detail="API Key is missing. Please provide it in the settings or set it in your environment."
    )

# Pydantic models for request bodies
class QueryRequest(BaseModel):
    query: str
    filenames: List[str]
    top_k: int = 5

class IndexRequest(BaseModel):
    filename: str

class DocumentActionRequest(BaseModel):
    filename: str

@app.get("/ping")
async def ping():
    return {"status": "alive"}

@app.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    x_api_key: Optional[str] = Header(None),
    x_gemini_api_key: Optional[str] = Header(None),
    x_api_provider: Optional[str] = Header(None),
    x_api_model: Optional[str] = Header(None)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    try:
        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Extract text using PyMuPDF
        text_content = extract_text_from_pdf(file_path)
        
        # Chunk text
        chunks = chunk_text(text_content, file.filename)
        
        # Try to get API Key and index the document.
        # Falls back to local offline embeddings if key is missing or API fails.
        indexed = False
        warning = None
        api_key = None
        try:
            api_key = get_api_key(x_api_key, x_gemini_api_key)
        except Exception:
            pass # No key found, get_embeddings will fall back to local hashing
            
        try:
            # Note: We always do embeddings with gemini-embedding-001 (or local fallback).
            # OpenRouter is only used for chat generation (LLM tasks).
            embeddings = get_embeddings([c["text"] for c in chunks], api_key)
            create_vector_store(file.filename, chunks, embeddings)
            indexed = True
            if not api_key:
                warning = "Indexed locally (offline keyword-matching mode) because API key is unconfigured."
        except Exception as e:
            # Save raw chunks to metadata anyway
            metadata_path = os.path.join(VECTOR_DIR, f"{file.filename}.json")
            with open(metadata_path, "w") as f:
                import json
                json.dump(chunks, f, indent=2)
            
            import traceback
            traceback.print_exc()
            warning = f"Indexing failed: {str(e)}. Text extracted."
            
        return {
            "status": "success",
            "filename": file.filename,
            "indexed": indexed,
            "total_chunks": len(chunks),
            "warning": warning
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@app.post("/index-document")
def index_document(
    payload: IndexRequest,
    x_api_key: Optional[str] = Header(None),
    x_gemini_api_key: Optional[str] = Header(None),
    x_api_provider: Optional[str] = Header(None),
    x_api_model: Optional[str] = Header(None)
):
    """
    Manually triggers embedding generation and indexing. Falls back to local indexing if key is missing.
    """
    api_key = None
    try:
        api_key = get_api_key(x_api_key, x_gemini_api_key)
    except Exception:
        pass
        
    filename = payload.filename
    metadata_path = os.path.join(VECTOR_DIR, f"{filename}.json")
    
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="Document text metadata not found. Please upload the PDF again.")
        
    try:
        with open(metadata_path, "r") as f:
            import json
            chunks = json.load(f)
            
        embeddings = get_embeddings([c["text"] for c in chunks], api_key)
        create_vector_store(filename, chunks, embeddings)
        
        mode_str = "with Gemini" if api_key else "locally (offline mode)"
        return {"status": "success", "message": f"Successfully indexed {filename} {mode_str}", "total_chunks": len(chunks)}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to index document: {str(e)}")

@app.get("/documents")
async def list_documents():
    """
    Lists all uploaded PDFs and their indexing status.
    """
    docs = []
    if os.path.exists(UPLOAD_DIR):
        for filename in os.listdir(UPLOAD_DIR):
            if filename.endswith(".pdf"):
                file_path = os.path.join(UPLOAD_DIR, filename)
                docs.append({
                    "filename": filename,
                    "size_bytes": os.path.getsize(file_path),
                    "indexed": is_document_indexed(filename)
                })
    return docs

@app.delete("/documents")
async def delete_all_documents():
    """
    Deletes all uploaded PDFs and their vector stores.
    """
    try:
        # Clear UPLOAD_DIR
        if os.path.exists(UPLOAD_DIR):
            for f in os.listdir(UPLOAD_DIR):
                path = os.path.join(UPLOAD_DIR, f)
                if os.path.isfile(path):
                    os.remove(path)
        # Clear VECTOR_DIR
        if os.path.exists(VECTOR_DIR):
            for f in os.listdir(VECTOR_DIR):
                path = os.path.join(VECTOR_DIR, f)
                if os.path.isfile(path):
                    os.remove(path)
        return {"status": "success", "message": "Cleared all documents and vector stores."}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to clear documents: {str(e)}")

@app.delete("/documents/{filename}")
async def delete_document(filename: str):
    """
    Deletes the PDF file, FAISS index, and JSON chunk metadata.
    """
    pdf_path = os.path.join(UPLOAD_DIR, filename)
    index_path = os.path.join(VECTOR_DIR, f"{filename}.index")
    metadata_path = os.path.join(VECTOR_DIR, f"{filename}.json")
    
    deleted = False
    
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
        deleted = True
    if os.path.exists(index_path):
        os.remove(index_path)
        deleted = True
    if os.path.exists(metadata_path):
        os.remove(metadata_path)
        deleted = True
        
    if not deleted:
        raise HTTPException(status_code=404, detail="File not found.")
        
    return {"status": "success", "message": f"Deleted {filename} and its vector store."}

@app.post("/query")
def query_documents(
    payload: QueryRequest,
    x_api_key: Optional[str] = Header(None),
    x_gemini_api_key: Optional[str] = Header(None),
    x_api_provider: Optional[str] = Header(None),
    x_api_model: Optional[str] = Header(None)
):
    """
    Performs retrieval and generation for the given user query.
    """
    api_key = None
    try:
        api_key = get_api_key(x_api_key, x_gemini_api_key)
    except Exception:
        pass
    
    if not payload.filenames:
        raise HTTPException(status_code=400, detail="Please select at least one document to search.")
        
    try:
        # Search the active documents
        results = query_vector_store(
            query=payload.query,
            active_filenames=payload.filenames,
            api_key=api_key,
            top_k=payload.top_k
        )
        
        warning = None
        if api_key:
            # Generate the answer using Gemini or OpenRouter
            answer = generate_answer(
                query=payload.query,
                search_results=results,
                api_key=api_key,
                provider=x_api_provider,
                model=x_api_model
            )
        else:
            # Simple offline text formatting
            if results:
                answer = "API key is unconfigured. Showing raw document search results:\n\n"
                for idx, r in enumerate(results):
                    chunk = r["chunk"]
                    answer += f"**Source {idx+1} ({chunk['filename']}, Page {chunk['page_number']})**:\n{chunk['text']}\n\n"
            else:
                answer = "No relevant context was found in the selected documents to answer your question."
            warning = "API key is unconfigured. Showing search snippets only."
        
        return {
            "answer": answer,
            "sources": [
                {
                    "filename": r["chunk"]["filename"],
                    "page_number": r["chunk"]["page_number"],
                    "text": r["chunk"]["text"],
                    "relevance_score": r["score"]
                } for r in results
            ],
            "warning": warning
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"RAG execution failed: {str(e)}")

@app.post("/generate-summary")
def get_summary(
    payload: DocumentActionRequest,
    x_api_key: Optional[str] = Header(None),
    x_gemini_api_key: Optional[str] = Header(None),
    x_api_provider: Optional[str] = Header(None),
    x_api_model: Optional[str] = Header(None)
):
    """
    Generates a document summary.
    """
    api_key = get_api_key(x_api_key, x_gemini_api_key)
    try:
        summary = generate_document_summary(payload.filename, api_key, provider=x_api_provider, model=x_api_model)
        return {"summary": summary}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")

@app.post("/generate-study-guide")
def get_study_guide(
    payload: DocumentActionRequest,
    x_api_key: Optional[str] = Header(None),
    x_gemini_api_key: Optional[str] = Header(None),
    x_api_provider: Optional[str] = Header(None),
    x_api_model: Optional[str] = Header(None)
):
    """
    Generates study guide materials (concepts, flashcards, and quizzes).
    """
    api_key = get_api_key(x_api_key, x_gemini_api_key)
    try:
        study_material = generate_study_material(payload.filename, api_key, provider=x_api_provider, model=x_api_model)
        return study_material
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Study guide generation failed: {str(e)}")
