import json
import os
import re

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
json_path = os.path.join(base_dir, "datalab_json", "datalab-output-filter1_volume1.pdf.json")

with open(json_path, encoding="utf-8") as f:
    doc = json.load(f)

# Find answer keys
tables = []
for page in doc.get("children", []):
    for block in page.get("children", []):
        if block.get("block_type") == "Table":
            tables.append(block.get("html", ""))
        elif "Answer" in block.get("html", "") or "answer" in block.get("html", ""):
            # Check if answer keys are stored as ListGroup or something else
            if block.get("block_type") != "Table":
                html = block.get("html", "")
                if "1.1.1" in html or "1.2.1" in html:
                    tables.append(f"Non-Table: {block.get('block_type')}\n" + html)

out_path = os.path.join(base_dir, "scripts", "table_output.txt")
with open(out_path, "w", encoding="utf-8") as f:
    for i, t in enumerate(tables[:10]):
        f.write(f"--- Table {i} ---\n{t[:1000]}\n")
