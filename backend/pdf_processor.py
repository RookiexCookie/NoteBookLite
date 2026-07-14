import fitz
def extract_text_from_pdf(file_path: str) -> str:
    text_content = []
    doc = fitz.open(file_path)
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        
        page_text = page.get_text("text")
        
        text_content.append(page_text)
        
    doc.close()
    
    return "\n--- Page Break ---\n".join(text_content)
