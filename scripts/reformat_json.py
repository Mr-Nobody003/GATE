import json
import re
import os

volumes = [
    ('data/filter1_volume1_structured.json', 'data/filter1_volume1_formatted.json', 'volume1', 'Volume 1'),
    ('data/filter1_volume2_structured.json', 'data/filter1_volume2_formatted.json', 'volume2', 'Volume 2'),
    ('data/filter1_volume3_structured.json', 'data/filter1_volume3_formatted.json', 'volume3', 'Volume 3')
]

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-') or 'topic'

all_data = {'volumes': {}}

for in_file, out_file, vol_id, vol_name in volumes:
    if not os.path.exists(in_file):
        continue
    with open(in_file, 'r', encoding='utf-8') as f:
        d = json.load(f)
        
    blocks = []
    current_block = []
    
    for item in d:
        topic = item.get('topic', '')
        if topic and 'Answer Key' in topic:
            blocks.append(current_block)
            current_block = []
        else:
            current_block.append(item)
    if current_block:
        blocks.append(current_block)
        
    parsed_volume = {
        'id': vol_id,
        'name': vol_name,
        'chapters': []
    }
    
    for i, block in enumerate(blocks):
        chap_num = str(i + 1)
        for item in block:
            if item.get('type') == 'question' and item.get('topic'):
                m = re.match(r'^(\d+)\.\d+', item.get('topic'))
                if m:
                    chap_num = m.group(1)
                    break
        
        chap_id = f'chap{chap_num}'
        chap_name = f'Chapter {chap_num}'
        
        toc_text = d[0].get('content', '') if d else ''
        for line in toc_text.split('\n'):
            m = re.match(rf'^{chap_num}\s+([^:]+(?::\s+[^(\n]+)?)', line.strip())
            if m:
                chap_name = m.group(0).split('(')[0].strip()
                break
                
        parsed_chapter = {
            'id': chap_id,
            'name': chap_name,
            'topics': [],
            'notes': [],
            'questions': []
        }
        
        topic_map = {}
        q_idx = 1
        n_idx = 1
        
        for item in block:
            if not item.get('topic'):
                continue
            
            topic = item.get('topic')
            clean_topic = re.sub(r'^\d+(\.\d+)+\s*', '', topic).split(':')[0].strip()
            if not clean_topic:
                clean_topic = 'General'
            
            if clean_topic not in topic_map:
                slug = slugify(clean_topic)
                suffix = 1
                final_slug = slug
                while final_slug in topic_map.values():
                    final_slug = f'{slug}-{suffix}'
                    suffix += 1
                topic_map[clean_topic] = final_slug
                
            slug = topic_map[clean_topic]
            
            if item.get('type') == 'note':
                if not item.get('content', '').strip():
                    continue
                parsed_chapter['notes'].append({
                    'id': f'{vol_id}-{chap_id}-note-{n_idx}',
                    'type': 'note',
                    'topic': clean_topic,
                    'topicSlug': slug,
                    'content': item.get('content', '')
                })
                n_idx += 1
            elif item.get('type') == 'question':
                if not item.get('question_text', '').strip():
                    continue
                parsed_chapter['questions'].append({
                    'id': f'{vol_id}-{chap_id}-q-{q_idx}',
                    'type': 'question',
                    'topic': clean_topic,
                    'topicSlug': slug,
                    'question_text': item.get('question_text', ''),
                    'options': item.get('options', None),
                    'answer': item.get('answer', None),
                    'solution': item.get('solution', None)
                })
                q_idx += 1
                
        parsed_chapter['topics'] = [{'name': k, 'slug': v} for k, v in topic_map.items()]
        
        if parsed_chapter['notes'] or parsed_chapter['questions']:
            parsed_volume['chapters'].append(parsed_chapter)
            
    all_data['volumes'][vol_id] = parsed_volume
    
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(parsed_volume, f, indent=2, ensure_ascii=False)
        print(f'Generated {out_file}')

with open('data/formatted_all.json', 'w', encoding='utf-8') as f:
    json.dump(all_data, f, indent=2, ensure_ascii=False)
    print('Generated formatted_all.json')
