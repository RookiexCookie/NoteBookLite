import os
import json
import numpy as np
import requests
from typing import List, Dict, Any

# Chunking Configuration
CHUNK_SIZE = 1000  # Character count
CHUNK_OVERLAP = 200

VECTOR_DIR = "vector_store"
os.makedirs(VECTOR_DIR, exist_ok=True)

def chunk_text(text: str, filename: str) -> List[Dict[str, Any]]:
    """
    Splits the extracted text into sliding window chunks.
    Tracks the page number based on '\n--- Page Break ---\n'.
    """
    pages = text.split("\n--- Page Break ---\n")
    chunks = []
    
    for page_idx, page_content in enumerate(pages):
        page_num = page_idx + 1
        content_len = len(page_content)
        
        # If the page is empty, skip
        if not page_content.strip():
            continue
            
        start = 0
        while start < content_len:
            end = min(start + CHUNK_SIZE, content_len)
            chunk_txt = page_content[start:end].strip()
            
            if chunk_txt:
                chunks.append({
                    "text": chunk_txt,
                    "page_number": page_num,
                    "filename": filename,
                    "id": f"{filename}_p{page_num}_{start}"
                })
                
            if end == content_len:
                break
            start += CHUNK_SIZE - CHUNK_OVERLAP
            
    return chunks

def get_local_embeddings(texts: List[str], num_features: int = 1024) -> List[List[float]]:
    """
    Pure Python/NumPy Hashing Vectorizer for 100% offline, free, zero-dependency local embeddings.
    Uses a deterministic DJB2 hash algorithm to remain consistent across restarts.
    """
    import re
    embeddings = []
    for text in texts:
        # Simple tokenization
        words = re.findall(r'\w+', text.lower())
        vector = np.zeros(num_features, dtype=np.float32)
        for word in words:
            # Deterministic DJB2 hash
            h = 5381
            for char in word:
                h = ((h << 5) + h) + ord(char)
            idx = (h & 0xffffffff) % num_features
            vector[idx] += 1.0
        
        # L2 Normalization
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        embeddings.append(vector.tolist())
    return embeddings

def get_embeddings(texts: List[str], api_key: Optional[str] = None) -> List[List[float]]:
    """
    Generates embeddings for a list of texts. Falls back to local hashing vectorizer
    if API key is missing or the external API call fails.
    """
    if not api_key or api_key.strip() == "":
        return get_local_embeddings(texts)
        
    embeddings = []
    batch_size = 100
    
    try:
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            
            # Build batch requests payload
            requests_payload = []
            for text in batch:
                requests_payload.append({
                    "model": "models/gemini-embedding-001",
                    "content": {
                        "parts": [{"text": text}]
                    }
                })
                
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key={api_key}"
            headers = {"Content-Type": "application/json"}
            
            response = requests.post(url, headers=headers, json={"requests": requests_payload}, timeout=15.0)
            if response.status_code != 200:
                raise Exception(f"Gemini API error: {response.text}")
                
            res_json = response.json()
            for emb_obj in res_json.get("embeddings", []):
                embeddings.append(emb_obj.get("values", []))
        return embeddings
    except Exception as e:
        print(f"Gemini Embedding API call failed. Falling back to local offline embeddings. Error: {str(e)}")
        return get_local_embeddings(texts)

def create_vector_store(filename: str, chunks: List[Dict[str, Any]], embeddings: List[List[float]]):
    """
    Saves the chunks along with their embeddings in a single JSON file.
    This serves as our local vector database, enabling simple and fast NumPy vector search.
    """
    if len(chunks) != len(embeddings):
        raise ValueError("Mismatch between chunks and embeddings counts.")
        
    # Append the embedding values directly into the chunk objects
    indexed_chunks = []
    for chunk, emb in zip(chunks, embeddings):
        chunk_with_emb = chunk.copy()
        chunk_with_emb["embedding"] = emb
        indexed_chunks.append(chunk_with_emb)
        
    metadata_path = os.path.join(VECTOR_DIR, f"{filename}.json")
    with open(metadata_path, "w") as f:
        json.dump(indexed_chunks, f, indent=2)

def query_vector_store(query: str, active_filenames: List[str], api_key: Optional[str] = None, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Performs Cosine Similarity vector search across all active JSON database files using NumPy.
    Dynamically adapts to local (1024d) or Gemini (3072d) document embeddings.
    """
    if not active_filenames or not query.strip():
        return []
        
    # Pre-generate query vectors for both modes on-demand to save redundant API calls
    gemini_query_vec = None
    local_query_vec = np.array(get_local_embeddings([query])[0], dtype=np.float32)
    
    all_results = []
    
    # Iterate through selected files and calculate cosine similarity
    for filename in active_filenames:
        metadata_path = os.path.join(VECTOR_DIR, f"{filename}.json")
        if not os.path.exists(metadata_path):
            continue
            
        with open(metadata_path, "r") as f:
            chunks = json.load(f)
            
        # Filter chunks that actually have embeddings
        valid_chunks = [c for c in chunks if "embedding" in c]
        if not valid_chunks:
            continue
            
        # Check dimensionality of stored embeddings
        dim = len(valid_chunks[0]["embedding"])
        
        # Decide query vector based on dimensionality
        if dim == 1024:
            query_vec = local_query_vec
        else:
            # 3072 dimension (Gemini)
            if gemini_query_vec is None:
                if not api_key:
                    # No API key available, skip Gemini similarity calculation for this document
                    print(f"Skipping Gemini similarity for {filename} because API Key is missing.")
                    continue
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={api_key}"
                    headers = {"Content-Type": "application/json"}
                    payload = {
                        "model": "models/gemini-embedding-001",
                        "content": {
                            "parts": [{"text": query}]
                        }
                    }
                    response = requests.post(url, headers=headers, json=payload, timeout=15.0)
                    if response.status_code != 200:
                        raise Exception(f"Gemini Query Embedding Error: {response.text}")
                    query_emb = response.json().get("embedding", {}).get("values", [])
                    gemini_query_vec = np.array(query_emb, dtype=np.float32)
                    query_norm = np.linalg.norm(gemini_query_vec)
                    if query_norm > 0:
                        gemini_query_vec = gemini_query_vec / query_norm
                except Exception as e:
                    print(f"Failed to generate Gemini query embedding. Skipping Gemini-indexed docs. Error: {str(e)}")
                    continue
            query_vec = gemini_query_vec
            
        # Extract embeddings and load into matrix
        embeddings_matrix = np.array([c["embedding"] for c in valid_chunks], dtype=np.float32)
        
        # Calculate L2 norms of all vectors
        norms = np.linalg.norm(embeddings_matrix, axis=1, keepdims=True)
        # Prevent division by zero
        normalized_embeddings = embeddings_matrix / (norms + 1e-10)
        
        # Calculate dot products (which equals cosine similarity for normalized vectors)
        scores = np.dot(normalized_embeddings, query_vec)
        
        for idx, score in enumerate(scores):
            # Clean copy of chunk without embedding data to save memory/payload size
            chunk_data = valid_chunks[idx].copy()
            chunk_data.pop("embedding", None)
            
            all_results.append({
                "score": float(score),
                "chunk": chunk_data
            })
            
    # Sort by score descending and return top_k
    all_results.sort(key=lambda x: x["score"], reverse=True)
    return all_results[:top_k]

def generate_llm_response(
    prompt: str,
    system_instruction: str,
    api_key: str,
    provider: str = "gemini",
    model: Optional[str] = None,
    response_json: bool = False
) -> str:
    """
    Generates text from either Google Gemini API or OpenRouter API.
    """
    provider_name = (provider or "gemini").lower().strip()
    
    if provider_name == "openrouter":
        model_name = model or "google/gemini-2.5-flash"
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "NotebookLite"
        }
        
        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ]
        }
        if response_json:
            payload["response_format"] = {"type": "json_object"}
            
        response = requests.post(url, headers=headers, json=payload, timeout=30.0)
        if response.status_code != 200:
            raise Exception(f"OpenRouter API Error: {response.text}")
            
        res_json = response.json()
        try:
            return res_json["choices"][0]["message"]["content"]
        except (KeyError, IndexError):
            raise Exception(f"Unexpected response format from OpenRouter: {res_json}")
            
    else:
        # Default Gemini provider
        model_name = model or "gemini-2.5-flash"
        # If they type the model name, e.g. "gemini-2.5-flash" -> use models/gemini-2.5-flash
        if not model_name.startswith("models/") and "/" not in model_name:
            model_name = f"models/{model_name}"
            
        url = f"https://generativelanguage.googleapis.com/v1beta/{model_name}:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "systemInstruction": {
                "parts": [{"text": system_instruction}]
            }
        }
        if response_json:
            payload["generationConfig"] = {
                "responseMimeType": "application/json"
            }
            
        response = requests.post(url, headers=headers, json=payload, timeout=30.0)
        if response.status_code != 200:
            raise Exception(f"Gemini LLM Generation Error: {response.text}")
            
        res_json = response.json()
        try:
            return res_json["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise Exception(f"Unexpected response format from Gemini: {res_json}")

def generate_answer(
    query: str,
    search_results: List[Dict[str, Any]],
    api_key: str,
    provider: str = "gemini",
    model: Optional[str] = None
) -> str:
    """
    Generates an answer using either Gemini or OpenRouter based on retrieved context.
    """
    if not search_results:
        return "No relevant context was found in the selected documents to answer your question."
        
    # Build context string
    context_str = ""
    for idx, item in enumerate(search_results):
        chunk = item["chunk"]
        score = item["score"]
        context_str += f"Source [{idx + 1}]:\n"
        context_str += f"File: {chunk['filename']}, Page: {chunk['page_number']} (relevance score: {score:.3f})\n"
        context_str += f"Content: {chunk['text']}\n"
        context_str += "----------------------------------------\n\n"
        
    system_instruction = (
        "You are an expert reading assistant (NotebookLM Lite) that answers questions strictly based on the provided document sources.\n"
        "Instructions:\n"
        "1. Answer the query ONLY using the provided source context. Do not use external knowledge or fabricate facts.\n"
        "2. If the answer cannot be found in the context, state: 'I cannot find the answer in the provided documents.'\n"
        "3. Provide in-text citations using the format [Source N] where N is the source index corresponding to the given context list.\n"
        "4. Keep your answer factual, comprehensive, and clear."
    )
    
    prompt = f"Context:\n{context_str}\nQuery: {query}"
    return generate_llm_response(prompt, system_instruction, api_key, provider, model)

def generate_document_summary(
    filename: str,
    api_key: str,
    provider: str = "gemini",
    model: Optional[str] = None
) -> str:
    """
    Generates a structured summary of the document using Gemini or OpenRouter.
    """
    metadata_path = os.path.join(VECTOR_DIR, f"{filename}.json")
    if not os.path.exists(metadata_path):
        return "Document has not been processed yet."
        
    with open(metadata_path, "r") as f:
        chunks = json.load(f)
        
    combined_text = ""
    for chunk in chunks:
        combined_text += chunk["text"] + "\n"
        if len(combined_text) > 40000:
            combined_text += "\n[Text truncated for length...]"
            break
            
    system_instruction = (
        "You are an expert content analyzer. Generate a clear, structured summary of the document provided.\n"
        "Your summary should include:\n"
        "- A brief 2-3 sentence high-level overview.\n"
        "- 4-6 bullet points highlighting the core concepts or key findings.\n"
        "- 2-3 key takeaways."
    )
    
    prompt = f"Document text:\n{combined_text}"
    return generate_llm_response(prompt, system_instruction, api_key, provider, model)

def generate_study_material(
    filename: str,
    api_key: str,
    provider: str = "gemini",
    model: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates study materials (flashcards, quiz, concepts) in JSON format using Gemini or OpenRouter.
    """
    metadata_path = os.path.join(VECTOR_DIR, f"{filename}.json")
    if not os.path.exists(metadata_path):
        return {"error": "Document has not been processed yet."}
        
    with open(metadata_path, "r") as f:
        chunks = json.load(f)
        
    combined_text = ""
    for chunk in chunks:
        combined_text += chunk["text"] + "\n"
        if len(combined_text) > 40000:
            combined_text += "\n[Text truncated for length...]"
            break
            
    system_instruction = (
        "You are a study assistant. Generate study materials in JSON format from the provided text.\n"
        "The JSON response MUST match this structure exactly:\n"
        "{\n"
        "  \"key_concepts\": [\n"
        "    { \"title\": \"Concept Name\", \"explanation\": \"Concept explanation...\" }\n"
        "  ],\n"
        "  \"flashcards\": [\n"
        "    { \"question\": \"Question or term?\", \"answer\": \"Answer or definition...\" }\n"
        "  ],\n"
        "  \"quiz\": [\n"
        "    { \"question\": \"Multiple-choice question?\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"answer\": \"Correct option string\" }\n"
        "  ]\n"
        "}\n"
        "Respond ONLY with valid JSON. Do not write markdown blocks or any conversational text."
    )
    
    prompt = f"Document text:\n{combined_text}"
    try:
        raw_text = generate_llm_response(prompt, system_instruction, api_key, provider, model, response_json=True)
        return json.loads(raw_text)
    except Exception as e:
        return {"error": f"Failed to parse study material: {str(e)}"}
