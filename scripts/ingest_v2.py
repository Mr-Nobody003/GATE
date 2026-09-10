import sys
import os
import json
import subprocess
import google.generativeai as genai
import shutil
from pathlib import Path

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("WARNING: GEMINI_API_KEY environment variable not set. Structurization will fail.")
genai.configure(api_key=api_key)

pro_model = genai.GenerativeModel('gemini-1.5-pro-latest')

def run_mineru_extraction(pdf_path, output_dir, start_page=None, end_page=None):
    """Run the magic-pdf CLI to extract Markdown from the PDF."""
    print(f"[*] Running MinerU extraction on {pdf_path}...")
    cmd = [
        ".\\venv\\Scripts\\magic-pdf.exe",
        "-p", pdf_path,
        "-o", output_dir
    ]
    if start_page is not None and end_page is not None:
        cmd.extend(["-s", str(start_page), "-e", str(end_page)])
    
    env = os.environ.copy()
    env["MINERU_TOOLS_CONFIG_JSON"] = os.path.abspath("magic-pdf.json")
    
    subprocess.run(cmd, env=env, check=True)
    print(f"[*] MinerU extraction completed. Output in {output_dir}")

def enrich_markdown_with_bboxes(md_path, middle_json_path):
    """Replace image paths in Markdown with exact PDF coordinates (page and bbox)."""
    with open(md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()
    with open(middle_json_path, 'r', encoding='utf-8') as f:
        middle = json.load(f)
        
    image_map = {}
    # Parse the middle.json blocks to map image filenames to page numbers and bounding boxes
    for page_idx, page_info in enumerate(middle.get("pdf_info", [])):
        def find_images(obj, current_bbox=None):
            if isinstance(obj, dict):
                bbox = obj.get("bbox", current_bbox)
                if "image_path" in obj:
                    image_map[obj["image_path"]] = {
                        "page": page_idx,
                        "bbox": bbox
                    }
                for v in obj.values():
                    find_images(v, bbox)
            elif isinstance(obj, list):
                for item in obj:
                    find_images(item, current_bbox)
                    
        for block in page_info.get("preproc_blocks", []):
            find_images(block, block.get("bbox"))
                
    # Replace image links in Markdown
    # MinerU outputs images like ![](images/uuid.jpg)
    for img_name, data in image_map.items():
        md_img_str1 = f"![](images/{img_name})"
        md_img_str2 = f"![]({img_name})"
        
        # We output a custom JSON string structure that the frontend can parse later to render PDF crops
        pointer = json.dumps({"pdf_loc": {"page": data["page"], "bbox": data["bbox"]}})
        replacement = f"[IMAGE_POINTER: {pointer}]"
        
        md_text = md_text.replace(md_img_str1, replacement)
        md_text = md_text.replace(md_img_str2, replacement)
        
    return md_text

def structure_with_gemini(enriched_md):
    """Pass the enriched Markdown to Gemini to parse into a strict JSON format."""
    print("[*] Sending enriched Markdown to Gemini for JSON structurization...")
    prompt = f"""
You are an expert data structurization system for GATE exam preparation.
I am providing you with Markdown text extracted perfectly from a PDF textbook. 
The markdown contains text, LaTeX math formulas, and image pointers in the format [IMAGE_POINTER: {{"pdf_loc": ...}}].

Your task is to parse this content into a highly structured JSON array.
We want to extract TWO types of content:
1. Questions (Previous Year Questions / Exercises)
2. Theoretical Notes / Formulas (The study material)

IMPORTANT FILTERS:
- Completely ignore any "Table of Contents", "Preface", or "Contributors" pages. Do not include them in the JSON.
- If it's a note, capture the whole section.
- If it's a question, capture the question, options, and solution if present.
- Retain all LaTeX formatting (e.g. $...$ and $$...$$).
- Retain all [IMAGE_POINTER: ...] tags exactly as they are within the text so the frontend knows where to crop the PDF.

Output a valid JSON array matching this exact schema:
[
  {{
    "type": "note",
    "topic": "Extracted Topic or Chapter Name",
    "content": "Full markdown content of the note, including LaTeX and image pointers."
  }},
  {{
    "type": "question",
    "topic": "Topic Name",
    "question_text": "Full markdown question text including IMAGE_POINTERs if any.",
    "options": ["Option A", "Option B", "Option C", "Option D"], // If it's an MCQ. If not an MCQ, set to null.
    "answer": "Correct Option or Value", // if available, else null
    "solution": "Solution text if available, else null"
  }}
]

Return ONLY valid JSON. Do not wrap in ```json markers if possible, just raw JSON.

Here is the document content:
```markdown
{enriched_md}
```
"""
    response = pro_model.generate_content(prompt)
    raw_text = response.text.strip()
    if raw_text.startswith("```json"):
        raw_text = raw_text[7:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3]
    return json.loads(raw_text)

def main():
    target_pdf = "filter1_volume1.pdf"
    
    # 1. Run MinerU Extraction
    # We will just test on pages 11 to 12 for speed during development
    mineru_out_dir = os.path.abspath("data_local/mineru_out")
    run_mineru_extraction(target_pdf, mineru_out_dir, start_page=11, end_page=12)
    
    # 2. Find output files
    base_name = target_pdf.replace(".pdf", "")
    pdf_out_dir = os.path.join(mineru_out_dir, base_name, "auto")
    
    md_file = os.path.join(pdf_out_dir, f"{base_name}.md")
    middle_json_file = os.path.join(pdf_out_dir, f"{base_name}_middle.json")
    
    if not os.path.exists(md_file):
        print("ERROR: MinerU output not found.")
        sys.exit(1)
        
    # 3. Enrich Markdown
    print("[*] Correlating Markdown images with PDF Bounding Boxes...")
    enriched_md = enrich_markdown_with_bboxes(md_file, middle_json_file)
    
    # Optional: Save enriched MD for debugging
    with open(f"data_local/{base_name}_enriched.md", "w", encoding="utf-8") as f:
        f.write(enriched_md)
        
    # 4. Structure with Gemini
    structured_json = structure_with_gemini(enriched_md)
    
    # 5. Save final JSON
    out_json_path = f"data_local/{base_name}_structured.json"
    with open(out_json_path, "w", encoding="utf-8") as f:
        json.dump(structured_json, f, indent=4, ensure_ascii=False)
        
    print(f"[*] SUCCESS! Extracted data saved to {out_json_path}")

if __name__ == "__main__":
    main()
