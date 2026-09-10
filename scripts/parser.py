import os
import json
import re
import argparse

def enrich_markdown_with_bboxes(md_path, middle_json_path):
    """Replace image paths in Markdown with exact PDF coordinates (page and bbox)."""
    with open(md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()
    with open(middle_json_path, 'r', encoding='utf-8') as f:
        middle = json.load(f)
        
    image_map = {}
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
                
    for img_name, data in image_map.items():
        md_img_str1 = f"![](images/{img_name})"
        md_img_str2 = f"![]({img_name})"
        
        pointer = json.dumps({"pdf_loc": {"page": data["page"], "bbox": data["bbox"]}})
        replacement = f"[IMAGE_POINTER: {pointer}]"
        
        md_text = md_text.replace(md_img_str1, replacement)
        md_text = md_text.replace(md_img_str2, replacement)
        
    return md_text

def parse_markdown_to_json(md_text):
    """Parse enriched markdown into structured JSON."""
    structured_data = []
    
    # Split text by headers (## or #)
    sections = re.split(r'(?m)^#{1,3}\s+(.+)$', md_text)
    
    current_topic = "General"
    
    # sections[0] is everything before the first header
    if sections[0].strip():
        structured_data.append({
            "type": "note",
            "topic": current_topic,
            "content": sections[0].strip()
        })
    
    for i in range(1, len(sections), 2):
        if i + 1 >= len(sections):
            break
            
        header = sections[i].strip()
        content = sections[i+1].strip()
        
        if not content:
            current_topic = header
            continue
            
        # Ignore TOC and Contributors
        if "table of contents" in header.lower() or "contributors" in header.lower():
            continue
            
        # Check if this section looks like a Question
        # Looking for things like GATE year labels, or A. B. C. D. patterns
        is_question = False
        options_text = None
        answer_text = None
        
        # Look for options (A. B. C. D.)
        # This is a very rough heuristic for highly irregular OCR text
        if re.search(r'\bA\.\s*.*\bB\.\s*', content) or 'gate' in header.lower():
            is_question = True
            
        # Look for Answer Keys
        ans_match = re.search(r'#+\s*Answer\s*key.*?([A-D])', content, re.IGNORECASE | re.DOTALL)
        if ans_match:
            answer_text = ans_match.group(1)
            is_question = True
            
        if "question" in header.lower():
            is_question = True

        if is_question:
            structured_data.append({
                "type": "question",
                "topic": header if "question" not in header.lower() else current_topic,
                "question_text": content,
                "options": None, # Stored inside question_text as raw text for robustness
                "answer": answer_text,
                "solution": None
            })
        else:
            structured_data.append({
                "type": "note",
                "topic": header,
                "content": content
            })
            
        current_topic = header

    return structured_data

def main():
    parser = argparse.ArgumentParser(description="Parse MinerU markdown into JSON")
    parser.add_argument("--md", required=True, help="Path to markdown file")
    parser.add_argument("--middle", required=True, help="Path to middle.json")
    parser.add_argument("--out", required=True, help="Path to output JSON file")
    args = parser.parse_args()
    
    print("[*] Correlating Markdown images with PDF Bounding Boxes...")
    enriched_md = enrich_markdown_with_bboxes(args.md, args.middle)
    
    print("[*] Parsing structured JSON...")
    structured_json = parse_markdown_to_json(enriched_md)
    
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(structured_json, f, indent=4, ensure_ascii=False)
        
    print(f"[*] SUCCESS! Extracted data saved to {args.out}")

if __name__ == "__main__":
    main()
