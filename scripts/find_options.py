import json
import os

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
json_path = os.path.join(base_dir, "datalab_json", "datalab-output-filter1_volume1.pdf.json")

with open(json_path, encoding="utf-8") as f:
    doc = json.load(f)

for page in doc.get("children", []):
    for block in page.get("children", []):
        if block.get("block_type") == "ListGroup":
            html = block.get("html", "")
            if "(A)" in html or "<li>A" in html or "<li>(A)" in html:
                print("Found ListGroup with options:")
                print(html)
                print("---")
        if block.get("block_type") == "Table":
            html = block.get("html", "")
            if "(A)" in html or "<td>(A)" in html:
                print("Found Table with options:")
                print(html)
                print("---")
