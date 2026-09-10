import sys
import os
import json
import time
import fitz  # PyMuPDF
import pdfplumber
from PIL import Image, ImageDraw, ImageFont
import PIL.PngImagePlugin
import google.generativeai as genai
from pyzbar.pyzbar import decode
import cv2
import numpy as np

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("WARNING: GEMINI_API_KEY environment variable not set. Vision extraction will fail.")
genai.configure(api_key=api_key)

# Initialize models for a mixed-tier strategy
lite_model = genai.GenerativeModel('gemini-3.1-flash-lite')
pro_model = genai.GenerativeModel('gemini-3.1-pro-preview')

def get_volume_name(pdf_path):
    basename = os.path.basename(pdf_path)
    return basename.replace('filter1_', '').replace('.pdf', '')

def decode_qrs(pil_img):
    """Find and decode QR codes in the image."""
    cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    decoded_objs = decode(cv_img)
    urls = []
    for obj in decoded_objs:
        try:
            url = obj.data.decode('utf-8')
            urls.append(url)
        except:
            pass
    return urls

def process_page(extracted_text, cropped_images, page_num, qr_urls, volume_name, model):
    prompt = f"""
    You are an expert OCR and data extraction system for engineering exam preparation (GATE).
    I am providing you with the plain text extracted from a page of a book, along with cropped images of the math formulas, diagrams, and raster glyphs from that same page.
    
    Extracted Text:
    ```
    {extracted_text}
    ```
    
    This page may contain:
    1. Chapter Notes (Key Concepts / Formulas / Tips / Pitfalls)
    2. Questions (MCQ, MSQ, NAT, Descriptive)
    3. Answer Keys (a table mapping question IDs to answers)
    
    I have also detected the following QR code URLs on this page: {qr_urls}. 
    Match these URLs to the corresponding questions (usually physically next to them).
    
    The cropped images provided after this text are ordered sequentially (Image 0, Image 1, etc.). 
    Use them to reconstruct the LaTeX for any math formulas missing or garbled in the text, and to identify diagrams.
    
    Extract the content into a structured JSON format matching this schema EXACTLY:
    {{
        "transcription_confidence": 95, 
        "notes": [
            {{
                "chapter": "Chapter Name",
                "content": "LaTeX content of the notes..."
            }}
        ],
        "questions": [
            {{
                "id": "e.g. 1.1.1",
                "chapter": "Chapter Name",
                "subtopic": "Subtopic Name",
                "exam_tag": "e.g. gatecse-2022",
                "type": "MCQ | MSQ | NAT | descriptive",
                "marks": "1 | 2",
                "question_text": "LaTeX text of the question. If there is a diagram, embed it as ![diagram](/images/<id>_diagram.png)",
                "options": ["LaTeX option A", "LaTeX option B", "LaTeX option C", "LaTeX option D"],
                "difficulty_tag": "normal | hard",
                "explanation_url": "Matching QR code URL, if any"
            }}
        ],
        "answer_keys": [
            {{
                "question_id": "1.1.1",
                "correct_answer": "A | X;Y | 10.5:11.5 | N/A"
            }}
        ],
        "diagrams": [
            {{
                "id": "e.g. 1.1.1_diagram",
                "image_index": 2 
            }}
        ]
    }}
    
    Guidelines:
    - Use KaTeX compatible LaTeX for all math. Wrap inline math in $...$ and block math in $$...$$.
    - 'type' is read directly from the tag line (e.g. 'numerical-answers' -> NAT, 'multiple-selects' -> MSQ, etc).
    - If there is a diagram, provide its index from the provided images in the 'diagrams' array under 'image_index'.
    - Return ONLY valid JSON, no markdown blocks around it.
    - Rate your transcription_confidence (1-100) based on how well you transcribed dense or complex math.
    """
    
    content_parts = [prompt]
    for idx, crop in enumerate(cropped_images):
        content_parts.append(f"Image {idx}:")
        content_parts.append(crop)
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = model.generate_content(content_parts)
            text = response.text.strip()
            # Clean up markdown if model outputs it despite instructions
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            
            data = json.loads(text.strip())
            return data
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "Quota" in error_msg or "Deadline Exceeded" in error_msg or "504" in error_msg:
                if attempt < max_retries - 1:
                    print(f"  [Attempt {attempt+1}/{max_retries}] API busy or rate limited (429/504). Sleeping 35s...")
                    time.sleep(35)
                    continue
            
            print(f"Error processing page {page_num} with model {model.model_name}: {e}")
            return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python ingest.py <pdf_path> [start_page] [end_page]")
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    start_page_str = sys.argv[2] if len(sys.argv) > 2 else ""
    end_page_str = sys.argv[3] if len(sys.argv) > 3 else ""
    
    start_page = int(start_page_str) if start_page_str else None
    end_page = int(end_page_str) if end_page_str else None
    
    volume_name = get_volume_name(pdf_path)
    
    # State tracking files
    os.makedirs('data', exist_ok=True)
    os.makedirs('public/images', exist_ok=True)
    
    state_file = f"data/state_{volume_name}.json"
    data_file = f"data/{volume_name}.json"
    
    # Load state
    if os.path.exists(state_file):
        with open(state_file, 'r') as f:
            state = json.load(f)
    else:
        state = {"processed_pages": []}
        
    if start_page is None:
        start_page = max(state["processed_pages"]) + 1 if state["processed_pages"] else 0
        
    if end_page is None:
        end_page = start_page + 50 # Process 50 pages per chunk by default
        
    # Load data
    if os.path.exists(data_file):
        with open(data_file, 'r') as f:
            all_data = json.load(f)
    else:
        all_data = {"notes": [], "questions": [], "answer_keys": []}
        
    print(f"Starting ingestion for {volume_name} (pages {start_page} to {end_page})")
    
    try:
        doc = fitz.open(pdf_path)
        pdf_plumber = pdfplumber.open(pdf_path)
    except Exception as e:
        print(f"Failed to open PDF: {e}")
        sys.exit(1)
        
    total_pages = len(doc)
    end_page = end_page if end_page is not None else total_pages
    
    for page_num in range(start_page, end_page):
        if page_num >= total_pages:
            break
            
        if page_num in state["processed_pages"]:
            print(f"Skipping page {page_num} (already processed).")
            continue
            
        print(f"Processing page {page_num}...")
        
        # 1. Rasterize at 200 DPI for QR code decoding
        page = doc.load_page(page_num)
        pix = page.get_pixmap(dpi=200)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        
        # Decode QR codes
        qr_urls = decode_qrs(img)
        if qr_urls:
            print(f"  Found {len(qr_urls)} QR codes: {qr_urls}")
            
        # 2. Extract Text and Crop Math/Diagram Regions via pdfplumber
        plumber_page = pdf_plumber.pages[page_num]
        extracted_text = plumber_page.extract_text() or ""
        
        cropped_images = []
        for i, img_dict in enumerate(plumber_page.images):
            # pdfplumber bbox coordinates
            x0, top, x1, bottom = img_dict['x0'], img_dict['top'], img_dict['x1'], img_dict['bottom']
            
            # fitz pixmap dpi is 200, pdfplumber uses 72 dpi points
            scale = 200 / 72.0
            left_px = x0 * scale
            top_px = top * scale
            right_px = x1 * scale
            bottom_px = bottom * scale
            
            # Add a small padding (5 pixels)
            pad = 5
            left_px = max(0, left_px - pad)
            top_px = max(0, top_px - pad)
            right_px = min(img.width, right_px + pad)
            bottom_px = min(img.height, bottom_px + pad)
            
            crop = img.crop((left_px, top_px, right_px, bottom_px))
            cropped_images.append(crop)
            
        print(f"  Extracted {len(extracted_text)} chars and {len(cropped_images)} crop regions.")
            
        # 3. Vision Extraction (Mixed Strategy)
        extracted = process_page(extracted_text, cropped_images, page_num, qr_urls, volume_name, lite_model)
        
        # Fall back to Pro model if Lite fails or has low confidence
        confidence = extracted.get("transcription_confidence", 0) if extracted else 0
        if not extracted or confidence < 85:
            print(f"  Flash-Lite confidence low ({confidence}/100) or failed. Escalating to Pro...")
            time.sleep(2)
            extracted_pro = process_page(extracted_text, cropped_images, page_num, qr_urls, volume_name, pro_model)
            if extracted_pro:
                extracted = extracted_pro
                print(f"  Pro model confidence: {extracted.get('transcription_confidence', 'unknown')}/100")
        else:
            print(f"  Flash-Lite confidence good ({confidence}/100). Proceeding.")
            
        if extracted:
            # Append data
            all_data["notes"].extend(extracted.get("notes", []))
            all_data["questions"].extend(extracted.get("questions", []))
            all_data["answer_keys"].extend(extracted.get("answer_keys", []))
            
            # Process diagrams
            diagrams = extracted.get("diagrams", [])
            for diag in diagrams:
                d_id = diag.get("id")
                img_idx = diag.get("image_index")
                if d_id and img_idx is not None and 0 <= img_idx < len(cropped_images):
                    save_path = f"public/images/{d_id}.png"
                    print(f"  Extracting diagram {d_id} (Image {img_idx}) to {save_path}")
                    os.makedirs(os.path.dirname(save_path), exist_ok=True)
                    cropped_images[img_idx].save(save_path)
            
            # Save checkpoint
            state["processed_pages"].append(page_num)
            
            with open(data_file, 'w') as f:
                json.dump(all_data, f, indent=2)
            with open(state_file, 'w') as f:
                json.dump(state, f, indent=2)
                
            print(f"  Successfully processed and saved checkpoint for page {page_num}.")
            
            # Be nice to the API rate limit
            time.sleep(2)
        else:
            print(f"  Failed to extract data from page {page_num}.")
            
    print("Ingestion run complete.")

if __name__ == "__main__":
    main()
