import re
import pymupdf

# Font-size bands observed empirically across sample pages.
CHAPTER_HEADER_SIZE = 10.5
SUBTOPIC_OR_QUESTION_HEADER_SIZE = 9.8  # same size; distinguished by id pattern
SECTION_SUBHEADING_SIZE = 11.2          # "Topic-wise Key Concepts" etc.
TAG_ROW_MAX_SIZE = 6.5                  # tag pills render at ~5.2pt
HEADER_TEXT_COLOR_WHITE = 16777215      # 0xFFFFFF -- white text on a colored bar

ID_CHAPTER = re.compile(r"^\d+$")
ID_SUBTOPIC = re.compile(r"^\d+\.\d+$")
ID_QUESTION = re.compile(r"^\d+\.\d+\.\d+$")

ANSWER_KEYS_TITLE = "Answer Keys"
TOPIC_KEY_CONCEPTS_TITLE = "Topic-wise Key Concepts"

# Tag vocabulary that GATE Overflow itself uses -- see the tag line under
# every question, e.g. "gatecse-2015-set1 combinatory normal numerical-answers summation"
TYPE_TAGS = {
    "numerical-answers": "NAT",
    "multiple-selects": "MSQ",
    "descriptive": "descriptive",
}
MARKS_TAGS = {"one-mark": 1, "two-marks": 2}
DIFFICULTY_TAGS = {"easy", "normal", "hard"}


def extract_rows(page, y_tol=1.5):
    """
    Reduce a page's text to a list of rows: text grouped by y-position
    (since a single visual "line" -- e.g. a header bar with a number on the
    left and a title on the right -- often comes back as multiple separate
    dict-API lines at the same y).

    Returns rows sorted top-to-bottom, each row's spans sorted left-to-right.
    Each row dict: {y, x0, text, size, font, color, bold}
    """
    d = page.get_text("dict")
    raw_lines = []
    for block in d.get("blocks", []):
        if "lines" not in block:
            continue
        for line in block["lines"]:
            # Ignore invisible OCR overlay text (e.g. from PDF24/Tesseract/Adobe
            # "searchable PDF" processing). These tools leave the original vector
            # content untouched and add a hidden text layer on top for search --
            # but that layer sits close enough to real headers to get merged into
            # the same row and poison font/color-based classification below.
            all_spans = [s for s in line["spans"] if s["font"] != "GlyphLessFont"]
            if not any(s["text"].strip() for s in all_spans):
                continue
            text = "".join(s["text"] for s in all_spans).strip()
            if not text:
                continue
            # use the first non-whitespace span for size/font/color/bold,
            # since a leading space span (if any) carries the wrong style
            content_spans = [s for s in all_spans if s["text"].strip()]
            first_content = content_spans[0]
            y = line["bbox"][1]
            x0 = line["bbox"][0]
            size = first_content["size"]
            font = first_content["font"]
            color = first_content["color"]
            bold = "bold" in font.lower()
            raw_lines.append(
                {"y": y, "x0": x0, "text": text, "size": size, "font": font,
                 "color": color, "bold": bold, "bbox": line["bbox"]}
            )

    raw_lines.sort(key=lambda r: (r["y"], r["x0"]))

    # merge lines that share (approximately) the same y into one row
    rows = []
    for ln in raw_lines:
        if rows and abs(rows[-1]["y"] - ln["y"]) <= y_tol:
            rows[-1]["parts"].append(ln)
            rows[-1]["text"] += " " + ln["text"]
        else:
            rows.append({"y": ln["y"], "text": ln["text"], "parts": [ln]})
    return rows


def classify_row(row):
    """
    Returns one of:
      ("chapter", number, title)
      ("subtopic", "N.N", title)
      ("question", "N.N.N", meta_text)
      ("tag_line", None, text)
      ("section_heading", None, text)   -- "Topic-wise Key Concepts" etc.
      ("answer_keys_title", None, text)
      (None, None, text)                -- ordinary body text
    """
    parts = row["parts"]
    first = parts[0]
    text = row["text"].strip()

    is_header_style = first["bold"] and first["color"] == HEADER_TEXT_COLOR_WHITE

    if is_header_style:
        leading = parts[0]["text"].strip()
        rest = " ".join(p["text"].strip() for p in parts[1:]).strip()
        if ID_QUESTION.match(leading):
            return ("question", leading, rest)
        if ID_SUBTOPIC.match(leading):
            return ("subtopic", leading, rest)
        if ID_CHAPTER.match(leading) and first["size"] >= CHAPTER_HEADER_SIZE - 0.3:
            return ("chapter", leading, rest)

    if first["size"] <= TAG_ROW_MAX_SIZE:
        return ("tag_line", None, text)

    if text == ANSWER_KEYS_TITLE:
        return ("answer_keys_title", None, text)

    if first["bold"] and first["size"] >= SECTION_SUBHEADING_SIZE - 0.3:
        return ("section_heading", None, text)

    return (None, None, text)


def parse_tag_line(text):
    """
    Split a tag line into structured fields.
    e.g. "gatecse-2015-set1 combinatory normal numerical-answers summation"
      -> exam_tag="gatecse-2015-set1", difficulty="normal",
         q_type="NAT", marks=None, topic_tags=["combinatory", "summation"]
    """
    tokens = text.split()
    exam_tag = None
    difficulty = None
    q_type = None
    marks = None
    topic_tags = []

    for tok in tokens:
        low = tok.lower()
        if low in TYPE_TAGS:
            q_type = TYPE_TAGS[low]
        elif low in MARKS_TAGS:
            marks = MARKS_TAGS[low]
        elif low in DIFFICULTY_TAGS:
            difficulty = low
        elif re.match(r"^(gate|isro|nielit|ugcnet|tifr)[a-z]*-?\d{4}", low):
            exam_tag = tok
        else:
            topic_tags.append(tok)

    return {
        "exam_tag": exam_tag,
        "difficulty": difficulty,
        "q_type_hint": q_type,   # None means "default to MCQ unless options say otherwise"
        "marks": marks,
        "topic_tags": topic_tags,
    }


def parse_answer_value(value):
    """
    Classify + normalize a raw Answer Keys table value.
    Returns (q_type, normalized_answer)
      "D"              -> ("MCQ", "D")
      "A;C"            -> ("MSQ", ["A", "C"])
      "N/A"            -> ("descriptive", None)
      "7"              -> ("NAT", {"low": 7.0, "high": 7.0})
      "195:195"        -> ("NAT", {"low": 195.0, "high": 195.0})
      "197.9 : 198.1"  -> ("NAT", {"low": 197.9, "high": 198.1})
    """
    v = value.strip()
    if v.upper() == "N/A":
        return ("descriptive", None)
    if ";" in v:
        return ("MSQ", [c.strip() for c in v.split(";") if c.strip()])
    if re.fullmatch(r"[A-E]", v):
        return ("MCQ", v)
    m = re.fullmatch(r"\s*(-?[\d.]+)\s*:\s*(-?[\d.]+)\s*", v)
    if m:
        return ("NAT", {"low": float(m.group(1)), "high": float(m.group(2))})
    m = re.fullmatch(r"\s*(-?[\d.]+)\s*", v)
    if m:
        n = float(m.group(1))
        return ("NAT", {"low": n, "high": n})
    # fallback -- unrecognized format, keep raw so nothing is silently dropped
    return ("unknown", v)


def parse_answer_keys_table(rows, start_index):
    """
    Given the full row list for a page and the index of its
    "Answer Keys" title row, consume subsequent rows as a grid of
    (question_id, answer_value) pairs -- up to 5 pairs sit side by side
    at the same y, so we walk each row's individual parts (already
    sorted left-to-right) rather than the merged row text.

    Stops at the first row that contains no question-id part at all
    (i.e. table has ended -- next chapter/notes content begins).

    Returns (answers_dict, next_index) where answers_dict maps
    "1.1.1" -> (q_type, normalized_answer).
    """
    answers = {}
    i = start_index + 1
    while i < len(rows):
        parts = rows[i]["parts"]
        ids_in_row = [p for p in parts if ID_QUESTION.match(p["text"].strip())]
        if not ids_in_row:
            break  # table ended
        pending_id = None
        for p in parts:
            t = p["text"].strip()
            if ID_QUESTION.match(t):
                pending_id = t
            elif pending_id is not None:
                answers[pending_id] = parse_answer_value(t)
                pending_id = None
        i += 1
    return answers, i


def parse_question_meta(meta_text):
    """
    Parse the free-text part of a question header row, e.g.
      "Balls In Bins: GATE CSE 1999 | Question: 1.3"
      "Summation: GATE CSE 2015 | Set 1 | Question: 26"
    into {topic_title, exam_label, set_label, original_question_no}
    """
    parts = [p.strip() for p in meta_text.split("|")]
    topic_title, exam_label = (parts[0].split(":", 1) + [""])[:2]
    topic_title = topic_title.strip()
    exam_label = exam_label.strip()

    set_label = None
    original_no = None
    for p in parts[1:]:
        if p.lower().startswith("set"):
            set_label = p
        elif p.lower().startswith("question:"):
            original_no = p.split(":", 1)[1].strip()

    return {
        "topic_title": topic_title,
        "exam_label": exam_label,
        "set_label": set_label,
        "original_question_no": original_no,
    }
