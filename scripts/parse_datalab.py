import base64
import json
import re
import os
import pymupdf
from structure import extract_rows, classify_row, parse_tag_line
from images import classify_page_images

QUESTION_ID_RE = re.compile(r"^(\d+\.\d+\.\d+)\b")
SUBTOPIC_NUM_RE = re.compile(r"^(\d+\.\d+)$")
TAG_TOKEN_RE = re.compile(r"^[a-z][a-z0-9]*(-[a-z0-9]+)*$")

def html_to_text(html):
    if not html:
        return ""
    html = re.sub(r'<math[^>]*display="block"[^>]*>(.*?)</math>', r"$$\1$$", html, flags=re.S)
    html = re.sub(r"<math[^>]*>(.*?)</math>", r"$\1$", html, flags=re.S)
    html = re.sub(r"<li[^>]*>", "\n- ", html)
    html = re.sub(r"<(p|div|tr|h[1-6]|br)[^>]*>", "\n", html)
    html = re.sub(r"<[^>]+>", " ", html)
    html = html.replace("&nbsp;", " ").replace("\xa0", " ")
    return re.sub(r"[ \t]+", " ", html).strip()

def looks_like_tag_line(text):
    if any(ch in text for ch in ".,;:?!()\"'"):
        return False
    tokens = text.split()
    if len(tokens) < 2:
        return False
    if not all(TAG_TOKEN_RE.match(tok) for tok in tokens):
        return False
    return any(any(c.isdigit() for c in tok) or "-" in tok for tok in tokens)

def flatten_blocks(doc):
    for page in doc.get("children", []):
        yield from _walk(page)

def _walk(node):
    yield node
    for c in node.get("children") or []:
        yield from _walk(c)

def parse_answer_value(value):
    v = value.strip()
    if v.upper() == "N/A":
        return ("descriptive", None)
    if ";" in v:
        return ("MSQ", [c.strip() for c in v.split(";") if c.strip()])
    if re.fullmatch(r"[A-E]", v):
        return ("MCQ", v)
    m = re.fullmatch(r"\s*(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)\s*", v)
    if m:
        try:
            return ("NAT", {"low": float(m.group(1)), "high": float(m.group(2))})
        except ValueError:
            pass
    m = re.fullmatch(r"\s*(-?\d+(?:\.\d+)?)\s*", v)
    if m:
        try:
            n = float(m.group(1))
            return ("NAT", {"low": n, "high": n})
        except ValueError:
            pass
    return ("unknown", v)

def parse_answer_table(html):
    cells = [html_to_text(c).strip() for c in re.findall(r"<td[^>]*>(.*?)</td>", html, flags=re.S)]
    out = {}
    for i in range(0, len(cells) - 1, 2):
        qid, val = cells[i], cells[i + 1]
        if QUESTION_ID_RE.match(qid):
            out[qid] = parse_answer_value(val)
    return out

def parse_toc_chapter_titles(doc):
    titles = {}
    chapter_line_re = re.compile(r"^(\d+)\s+(.+?)\s*\(\d+\)$")
    for b in flatten_blocks(doc):
        if b.get("block_type") != "TableOfContents":
            continue
        cells = [html_to_text(c) for c in re.findall(r"<td>(.*?)</td>", b.get("html") or "", flags=re.S)]
        for i in range(0, len(cells) - 1, 2):
            m = chapter_line_re.match(cells[i].strip())
            if m:
                titles[m.group(1)] = {"title": m.group(2).strip(), "start_page": int(cells[i + 1].strip())}
    return titles

def chapter_for_page(page_num, chapter_starts):
    best = None
    for ch, start in chapter_starts.items():
        if start <= page_num and (best is None or start > chapter_starts[best]):
            best = ch
    return best

def slugify(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')

def merge_explanation_urls(questions, original_pdf_path):
    def next_boundary_y(rows, start_idx):
        for j in range(start_idx + 1, len(rows)):
            k, _, _ = classify_row(rows[j])
            if k in ("chapter", "subtopic", "question", "answer_keys_title"):
                return rows[j]["y"]
        return None
    doc = pymupdf.open(original_pdf_path)
    urls = {}
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        rows = extract_rows(page)
        qrs, _ = classify_page_images(page)
        for i, row in enumerate(rows):
            kind, ident, _ = classify_row(row)
            if kind != "question":
                continue
            y0 = row["y"]
            y1 = next_boundary_y(rows, i) or page.rect.height
            match = [q for q in qrs if y0 - 5 <= q["bbox"][1] <= y1 + 5]
            if match and match[0]["url"]:
                urls[ident] = match[0]["url"]
    for q in questions:
        if q["id"] in urls:
            q["explanation_url"] = urls[q["id"]]
    return questions

def merge_tag_lines(questions, original_pdf_path):
    def next_boundary_y(rows, start_idx):
        for j in range(start_idx + 1, len(rows)):
            k, _, _ = classify_row(rows[j])
            if k in ("chapter", "subtopic", "question", "answer_keys_title"):
                return rows[j]["y"]
        return None
    doc = pymupdf.open(original_pdf_path)
    tag_data = {}
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        rows = extract_rows(page)
        for i, row in enumerate(rows):
            kind, ident, _ = classify_row(row)
            if kind != "question":
                continue
            y0 = row["y"]
            y1 = next_boundary_y(rows, i) or page.rect.height
            tag_rows = [r for r in rows if y0 < r["y"] < y1 and classify_row(r)[0] == "tag_line"]
            if tag_rows:
                raw = tag_rows[0]["text"].strip()
                tag_data[ident] = {"tag_line": raw, **parse_tag_line(raw)}
    for q in questions:
        if q["id"] in tag_data:
            q.update(tag_data[q["id"]])
    return questions

def extract_options(text):
    # Try regex that captures A. (A) A . options
    # We use \b to make sure it's a word boundary for A, B, C, D
    # and look for optional spaces and a dot or parentheses
    pattern = r"(?:(?:\(A\)|A\s*\.))(.*?)(?:(?:\(B\)|B\s*\.))(.*?)(?:(?:\(C\)|C\s*\.))(.*?)(?:(?:\(D\)|D\s*\.))(.*)"
    match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
    
    if match:
        opts = [m.strip() for m in match.groups()]
        new_text = text[:match.start()].strip()
        new_text = re.sub(r'[-\s]+$', '', new_text)
        return new_text, opts
        
    lines = text.split('\n')
    opts = []
    opt_labels = ['A', 'B', 'C', 'D']
    idx = 0
    new_lines = []
    for line in lines:
        if idx < 4:
            pattern2 = rf"^(?:{opt_labels[idx]}\s*\.|\({opt_labels[idx]}\)|\-\s*{opt_labels[idx]}\s*\.)(.*)"
            m = re.match(pattern2, line.strip(), re.IGNORECASE)
            if m:
                opts.append(m.group(1).strip())
                idx += 1
                continue
        new_lines.append(line)
        
    if idx == 4:
        return '\n'.join(new_lines).strip(), opts
        
    return text, None

def parse_datalab_json(json_path, pdf_path, output_json_path):
    with open(json_path, encoding="utf-8") as f:
        doc = json.load(f)

    chapter_info = parse_toc_chapter_titles(doc)
    chapter_starts = {ch: info["start_page"] for ch, info in chapter_info.items()}

    questions = {}
    order = []
    answers = {}
    notes_by_chapter = {}

    current_qid = None

    for b in flatten_blocks(doc):
        bt = b.get("block_type")

        if bt == "Table":
            answers.update(parse_answer_table(b.get("html") or ""))
            current_qid = None
            continue

        if bt in ("Page", "PageHeader", "PageFooter", "TableOfContents"):
            continue

        text = html_to_text(b.get("html") or "")
        m = QUESTION_ID_RE.match(text)
        if m:
            qid = m.group(1)
            current_qid = qid
            if qid not in questions:
                questions[qid] = {
                    "id": qid,
                    "chapter": qid.split(".")[0],
                    "chapter_title": chapter_info.get(qid.split(".")[0], {}).get("title"),
                    "subtopic": ".".join(qid.split(".")[:2]),
                    "text_parts": [],
                    "tag_line": None,
                    "explanation_url": None,
                    "diagram_images": [],
                }
                order.append(qid)
            # If the block is just the question ID (like in SectionHeader), don't append it to text.
            # But if the block has more text (like a Text block), we should append it minus the ID? 
            # Datalab JSON usually puts the ID as a separate block or prepends it to the question text.
            # Let's just strip the ID prefix and append the rest if any.
            rest_text = text[len(qid):].strip()
            if rest_text:
                questions[qid]["text_parts"].append(rest_text)
            continue

        if current_qid is None:
            if (text and bt != "Picture"
                    and not text.lower().startswith("answer key")
                    and not looks_like_tag_line(text)):
                ch = chapter_for_page(b.get("page", 0) + 1, chapter_starts)
                if ch:
                    notes_by_chapter.setdefault(ch, []).append(text)
            continue

        q = questions[current_qid]
        if bt == "Picture":
            alt_text = ""
            m = re.search(r'alt="([^"]*)"', b.get("html") or "")
            if m:
                alt_text = m.group(1).lower()
            if "qr code" in alt_text:
                pass
            else:
                for fname, b64data in (b.get("images") or {}).items():
                    q["diagram_images"].append({
                        "filename": fname, 
                        "data_base64": b64data
                    })
            continue

        if not text or text.lower().startswith("answer key"):
            continue
        if looks_like_tag_line(text):
            q["tag_line"] = text
            continue
        q["text_parts"].append(text)

    q_list = [questions[qid] for qid in order]
    
    if os.path.exists(pdf_path):
        q_list = merge_explanation_urls(q_list, pdf_path)
        q_list = merge_tag_lines(q_list, pdf_path)

    chapters_map = {}
    
    for q in q_list:
        ch_id = q["chapter"]
        if ch_id not in chapters_map:
            chapters_map[ch_id] = {
                "id": ch_id,
                "name": q.get("chapter_title") or f"Chapter {ch_id}",
                "topics": [],
                "notes": [],
                "questions": []
            }
            
        topic_name = f"Topic {q['subtopic']}"
        topic_slug = slugify(topic_name)
        
        if not any(t["slug"] == topic_slug for t in chapters_map[ch_id]["topics"]):
            chapters_map[ch_id]["topics"].append({
                "name": topic_name,
                "slug": topic_slug
            })
            
        qtype, correct_answer = answers.get(q["id"], ("unknown", None))
        
        raw_text = "\n\n".join(q["text_parts"])
        
        # Extract options
        question_text, options = extract_options(raw_text)
        
        # Append images as base64
        for img in q["diagram_images"]:
            ext = img["filename"].split('.')[-1].lower()
            mime = "image/png" if ext == "png" else "image/jpeg"
            b64 = img["data_base64"]
            question_text += f"\n\n<img src=\"data:{mime};base64,{b64}\" />"

        chapters_map[ch_id]["questions"].append({
            "id": q["id"],
            "type": "question",
            "qtype": qtype,
            "topic": topic_name,
            "topicSlug": topic_slug,
            "question_text": question_text,
            "options": options,
            "answer": correct_answer,
            "solution": q.get("explanation_url")
        })

    for ch_id, notes in notes_by_chapter.items():
        if ch_id in chapters_map:
            note_content = "\n\n".join(notes)
            chapters_map[ch_id]["notes"].append({
                "id": f"note-{ch_id}",
                "type": "note",
                "topic": "General Notes",
                "topicSlug": "general-notes",
                "content": note_content
            })

    print(f"Parsed {len(q_list)} questions from {json_path}")
    return list(chapters_map.values())

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_json_path = os.path.join(base_dir, "data", "formatted_all.json")
    
    volumes_config = [
        {"id": "volume1", "name": "Volume 1", "json": "datalab-output-filter1_volume1.pdf.json", "pdf": "public/pdfs/filter1_volume1.pdf"},
        {"id": "volume2", "name": "Volume 2", "json": "datalab-output-filter1_volume2.pdf.json", "pdf": "public/pdfs/filter1_volume2.pdf"},
        {"id": "volume3", "name": "Volume 3", "json": "datalab-output-filter1_volume3.pdf.json", "pdf": "public/pdfs/filter1_volume3.pdf"}
    ]
    
    parsed_data = {
        "volumes": {}
    }
    
    total_q = 0
    
    for vol in volumes_config:
        json_path = os.path.join(base_dir, "datalab_json", vol["json"])
        pdf_path = os.path.join(base_dir, vol["pdf"])
        
        if not os.path.exists(json_path):
            print(f"Warning: {json_path} does not exist. Skipping.")
            continue
            
        chapters = parse_datalab_json(json_path, pdf_path, output_json_path)
        parsed_data["volumes"][vol["id"]] = {
            "id": vol["id"],
            "name": vol["name"],
            "chapters": chapters
        }
        total_q += sum(len(ch["questions"]) for ch in chapters)
        
    os.makedirs(os.path.dirname(output_json_path), exist_ok=True)
    
    # Post-process to link external images from public/images
    img_dir = os.path.join(base_dir, "public", "images")
    if os.path.exists(img_dir):
        def get_qid(f):
            m = re.match(r'^q_(\d+)_(\d+)_(\d+)_', f)
            if m: return f"{m.group(1)}.{m.group(2)}.{m.group(3)}"
            m = re.match(r'^(\d+\.\d+\.\d+)_', f)
            if m: return m.group(1)
            return None
            
        def get_note_ch(f):
            m = re.match(r'^(\d+)_diagram\.png$', f)
            if m: return m.group(1)
            return None
        
        images = os.listdir(img_dir)
        img_map = {}
        note_map = {}
        for img in images:
            qid = get_qid(img)
            if qid:
                img_map.setdefault(qid, []).append(img)
            ch_id = get_note_ch(img)
            if ch_id:
                note_map.setdefault(ch_id, []).append(img)
                
        for v_id, vol in parsed_data['volumes'].items():
            for chapter in vol['chapters']:
                for q in chapter['questions']:
                    qid = q['id']
                    if qid in img_map:
                        for img in sorted(img_map[qid]):
                            img_path = f"/images/{img}"
                            if img_path not in q['question_text']:
                                q['question_text'] += f'\n\n<img src="{img_path}" alt="diagram" />'
                for note in chapter.get('notes', []):
                    ch_id = chapter['id']
                    if ch_id in note_map:
                        for img in sorted(note_map[ch_id]):
                            img_path = f"/images/{img}"
                            if img_path not in note['content']:
                                note['content'] += f'\n\n<img src="{img_path}" alt="diagram" />'

    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(parsed_data, f, indent=2, ensure_ascii=False)
        
    print(f"Total Data parsed successfully. {total_q} questions extracted across all volumes.")
    print(f"Saved to {output_json_path}")
