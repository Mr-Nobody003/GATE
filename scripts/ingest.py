import sys
import os
import json
import time
import fitz  # PyMuPDF
from PIL import Image
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

def crop_and_save_diagram(pil_img, bbox_1000, save_path):
    """
    bbox_1000 is [ymin, xmin, ymax, xmax] in 0-1000 normalized coordinates.
    Crops the image and saves it.
    """
    width, height = pil_img.size
    ymin, xmin, ymax, xmax = bbox_1000
    
    # Convert from 0-1000 to pixel coordinates
    left = (xmin / 1000.0) * width
    upper = (ymin / 1000.0) * height
    right = (xmax / 1000.0) * width
    lower = (ymax / 1000.0) * height
    
    # Ensure valid coordinates
    left, right = sorted([left, right])
    upper, lower = sorted([upper, lower])
    
    cropped = pil_img.crop((left, upper, right, lower))
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    cropped.save(save_path)

def process_page(pil_img, page_num, qr_urls, volume_name, model):
    prompt = f"""
    You are an expert OCR and data extraction system for engineering exam preparation (GATE).
    I am providing you with a high-resolution image of a page from a book.
    
    This page may contain:
    1. Chapter Notes (Key Concepts / Formulas / Tips / Pitfalls)
    2. Questions (MCQ, MSQ, NAT, Descriptive)
    3. Answer Keys (a table mapping question IDs to answers)
    
    I have also detected the following QR code URLs on this page: {qr_urls}. 
    Match these URLs to the corresponding questions (usually physically next to them).
    
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
                "bbox": [ymin, xmin, ymax, xmax] 
            }}
        ]
    }}
    
    Guidelines:
    - Use KaTeX compatible LaTeX for all math. Wrap inline math in $...$ and block math in $$...$$.
    - 'type' is read directly from the tag line (e.g. 'numerical-answers' -> NAT, 'multiple-selects' -> MSQ, etc).
    - If there is a diagram, provide its bounding box in 'diagrams' using normalized coordinates (0 to 1000), where [0,0,1000,1000] is the whole image. The order must be [ymin, xmin, ymax, xmax].
    - Return ONLY valid JSON, no markdown blocks around it.
    - Rate your transcription_confidence (1-100) based on how well you transcribed dense or complex math. If there is heavy math and you struggled, give a low score.
    """
    
    try:
        response = model.generate_content([prompt, pil_img])
        text = response.text.strip()
        # Clean up markdown if model outputs it despite instructions
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        
        data = json.loads(text.strip())
        return data
    except Exception as e:
        print(f"Error processing page {page_num} with model {model.model_name}: {e}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python ingest.py <pdf_path> [max_pages]")
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    max_pages = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else None
    
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
        
    # Load data
    if os.path.exists(data_file):
        with open(data_file, 'r') as f:
            all_data = json.load(f)
    else:
        all_data = {"notes": [], "questions": [], "answer_keys": []}
        
    print(f"Starting ingestion for {volume_name} (max_pages={max_pages})")
    
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"Failed to open PDF: {e}")
        sys.exit(1)
        
    pages_attempted_this_run = 0
    
    for page_num in range(len(doc)):
        if max_pages and pages_attempted_this_run >= max_pages:
            print(f"Reached max_pages limit ({max_pages}). Stopping.")
            break
            
        if page_num in state["processed_pages"]:
            print(f"Skipping page {page_num} (already processed).")
            continue
            
        pages_attempted_this_run += 1
        print(f"Processing page {page_num}...")
        
        # 1. Rasterize at 200 DPI (good balance of quality and speed)
        page = doc.load_page(page_num)
        pix = page.get_pixmap(dpi=200)
        
        # Convert fitz pixmap to PIL Image
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        
        # 2. Decode QR codes
        qr_urls = decode_qrs(img)
        if qr_urls:
            print(f"  Found {len(qr_urls)} QR codes: {qr_urls}")
            
        # 3. Vision Extraction (Mixed Strategy)
        extracted = process_page(img, page_num, qr_urls, volume_name, lite_model)
        
        # Fall back to Pro model if Lite fails or has low confidence
        confidence = extracted.get("transcription_confidence", 0) if extracted else 0
        if not extracted or confidence < 85:
            print(f"  Flash-Lite confidence low ({confidence}/100) or failed. Escalating to Pro...")
            time.sleep(2)
            extracted_pro = process_page(img, page_num, qr_urls, volume_name, pro_model)
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
                bbox = diag.get("bbox")
                if d_id and bbox and len(bbox) == 4:
                    save_path = f"public/images/{d_id}.png"
                    print(f"  Extracting diagram {d_id} to {save_path}")
                    crop_and_save_diagram(img, bbox, save_path)
            
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
