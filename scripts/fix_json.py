import json

data = json.load(open('data/formatted_all.json', encoding='utf-8'))

def fix_dollar(node):
    if isinstance(node, dict):
        for k, v in node.items():
            node[k] = fix_dollar(v)
        return node
    elif isinstance(node, list):
        return [fix_dollar(item) for item in node]
    elif isinstance(node, str):
        # Fix \$$ which KaTeX hates
        return node.replace('\\$$', '\\$')
    else:
        return node

data = fix_dollar(data)

with open('data/formatted_all.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Fixed $$")
