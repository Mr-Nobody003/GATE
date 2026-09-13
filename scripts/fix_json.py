import json
import re

def count_dollars(s):
    if not isinstance(s, str): return 0
    return s.replace('\\$', '').count('$')

def is_broken(question):
    if count_dollars(question.get('question_text', '')) % 2 != 0:
        return True
    for opt in question.get('options') or []:
        if count_dollars(opt) % 2 != 0:
            return True
    return False

def reconstruct(question):
    s = question.get('question_text', '')
    options = question.get('options') or []
    labels = ['A', 'B', 'C', 'D', 'E']
    for i, opt in enumerate(options):
        label = labels[i] if i < len(labels) else 'X'
        if s.endswith('- '):
            delim = f"{label}. "
        elif s.endswith('-'):
            delim = f" {label}. "
        else:
            delim = f"({label})"
        s += delim + opt
    return s

def reparse(full_text):
    seq = ['A', 'B', 'C', 'D']
    pattern = re.compile(r'(?:(?<=\s)|(?<=^))(?:-?\s*\b([ABCD])\.\s+|\(([ABCD])\))')
    valid_splits = []
    for match in pattern.finditer(full_text):
        prefix = full_text[:match.start()]
        if count_dollars(prefix) % 2 == 0:
            letter = match.group(1) or match.group(2)
            valid_splits.append((letter, match.start(), match.end()))
            
    chosen_splits = []
    current_idx = 0
    for split in valid_splits:
        if current_idx < 4 and split[0] == seq[current_idx]:
            chosen_splits.append(split)
            current_idx += 1
            
    if len(chosen_splits) == 4:
        q_text = full_text[:chosen_splits[0][1]].strip()
        opt_A = full_text[chosen_splits[0][2]:chosen_splits[1][1]].strip()
        opt_B = full_text[chosen_splits[1][2]:chosen_splits[2][1]].strip()
        opt_C = full_text[chosen_splits[2][2]:chosen_splits[3][1]].strip()
        opt_D = full_text[chosen_splits[3][2]:].strip()
        return q_text, [opt_A, opt_B, opt_C, opt_D]
        
    pattern2 = re.compile(r'(?:-?\s*\b([ABCD])\.\s+|\(([ABCD])\))')
    valid_splits2 = []
    for match in pattern2.finditer(full_text):
        prefix = full_text[:match.start()]
        if count_dollars(prefix) % 2 == 0:
            letter = match.group(1) or match.group(2)
            valid_splits2.append((letter, match.start(), match.end()))
            
    chosen_splits2 = []
    current_idx = 0
    for split in valid_splits2:
        if current_idx < 4 and split[0] == seq[current_idx]:
            chosen_splits2.append(split)
            current_idx += 1
            
    if len(chosen_splits2) == 4:
        q_text = full_text[:chosen_splits2[0][1]].strip()
        opt_A = full_text[chosen_splits2[0][2]:chosen_splits2[1][1]].strip()
        opt_B = full_text[chosen_splits2[1][2]:chosen_splits2[2][1]].strip()
        opt_C = full_text[chosen_splits2[2][2]:chosen_splits2[3][1]].strip()
        opt_D = full_text[chosen_splits2[3][2]:].strip()
        return q_text, [opt_A, opt_B, opt_C, opt_D]

    return None, None

def fix_control_chars(s):
    # This function fixes improperly escaped LaTeX commands that were parsed as control characters.
    # In Python, '\n' is a newline. But in the original LaTeX, it was '\neq' which got parsed as '\n' + 'eq'.
    # We want to restore it to '\\neq'.
    
    replacements = {
        '\neq': '\\neq',
        '\neg': '\\neg',
        '\notin': '\\notin',
        '\nabla': '\\nabla',
        '\nu': '\\nu',
        '\rightarrow': '\\rightarrow',
        '\text': '\\text',
        '\tau': '\\tau',
        '\theta': '\\theta',
        '\times': '\\times',
        '\forall': '\\forall',
        '\frac': '\\frac',
        '\beta': '\\beta',
        '\alpha': '\\alpha',
        '\vee': '\\vee'
    }
    
    for k, v in replacements.items():
        if k in s:
            s = s.replace(k, v)
    return s

def replace_typos(s):
    if not isinstance(s, str): return s
    s = fix_control_chars(s)
    
    s = s.replace('Expr\\$ ', 'Expr\\$$ ')
    s = s.replace('Expr\\$', 'Expr\\$$')
    s = s.replace('\\_Expr\\\\$', '\\_Expr\\$')
    s = s.replace('Expr\\\\$', 'Expr\\$')
    
    s = s.replace('$, and, |', '\\$, and, |')
    s = s.replace('$ indicates end of input', '\\$ indicates end of input')
    s = s.replace('and $\\', 'and $\\\\$')
    s = s.replace('and $\\$', 'and $\\\\$')
    s = s.replace('operators $\\$ and $\\#$', 'operators \\$ and \\#')
    s = s.replace('operators $\\$', 'operators \\$')
    s = s.replace('reverse of x}\\$,', 'reverse of x}\\}$,')
    s = s.replace('\\mid w\\$', '\\mid w')
    s = s.replace('\\mid w$', '\\mid w')
    s = s.replace('Print($);', 'Print(\\$);')
    s = s.replace('$ has higher precedence', '\\$ has higher precedence')
    s = s.replace('; $ is right associative', '; \\$ is right associative')
    s = s.replace('$\\*\\$', '\\$*\\$')
    s = s.replace('$-\\$', '\\$-\\$')
    s = s.replace('$+\\$', '\\$+\\$')
    s = s.replace('$*\\$', '\\$*\\$')
    s = s.replace('$\\+\\$', '\\$\\+\\$')
    s = s.replace('\\$$', '\\$')
    return s

def fix_dollar(node):
    if isinstance(node, dict):
        if 'id' in node and 'type' in node and node['type'] == 'question':
            if is_broken(node):
                full = reconstruct(node)
                nq, nopt = reparse(full)
                if nq and nopt:
                    node['question_text'] = nq
                    node['options'] = nopt
            
            if 'question_text' in node:
                node['question_text'] = replace_typos(node['question_text'])
            if 'options' in node and node['options']:
                node['options'] = [replace_typos(opt) for opt in node['options']]
            if 'solution' in node and node['solution']:
                node['solution'] = replace_typos(node['solution'])
        
        for k, v in node.items():
            if k not in ['question_text', 'options', 'solution']:
                node[k] = fix_dollar(v)
        return node
    elif isinstance(node, list):
        return [fix_dollar(item) for item in node]
    elif isinstance(node, str):
        return replace_typos(node)
    else:
        return node

if __name__ == "__main__":
    with open('data/formatted_all.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    data = fix_dollar(data)
    
    with open('data/formatted_all.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        
    print("KaTeX JSON issues and formatting typos fixed.")
