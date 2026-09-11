import json
import os
import re

def get_qid(f):
    m = re.match(r'^q_(\d+)_(\d+)_(\d+)_', f)
    if m: return f"{m.group(1)}.{m.group(2)}.{m.group(3)}"
    m = re.match(r'^(\d+\.\d+\.\d+)_', f)
    if m: return m.group(1)
    m = re.match(r'^(\d+)_', f)
    if m: return m.group(1)
    return None

def main():
    json_path = 'data/formatted_all.json'
    img_dir = 'public/images'
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    images = os.listdir(img_dir)
    img_map = {}
    for img in images:
        qid = get_qid(img)
        if qid:
            img_map.setdefault(qid, []).append(img)
            
    updated_count = 0
    for v_id, vol in data['volumes'].items():
        for chapter in vol['chapters']:
            for q in chapter['questions']:
                qid = q['id']
                if qid in img_map:
                    # check if the images are already in question_text to prevent duplicates
                    for img in sorted(img_map[qid]):
                        img_path = f"/images/{img}"
                        if img_path not in q['question_text']:
                            q['question_text'] += f'\n\n<img src="{img_path}" alt="diagram" />'
                            updated_count += 1
                            
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        
    print(f"Updated {updated_count} image references across questions.")

if __name__ == '__main__':
    main()
