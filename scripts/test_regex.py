import re

def extract_options(text):
    clean = text.replace('', ' ')
    # Check for ordered options A, B, C, D
    # Allow optional spaces before the dot
    pattern = r"(?:\(A\)|A\s*\.)(.*?)(?:\(B\)|B\s*\.)(.*?)(?:\(C\)|C\s*\.)(.*?)(?:\(D\)|D\s*\.)(.*)"
    match = re.search(pattern, clean, re.DOTALL | re.IGNORECASE)
    
    if match:
        opts = [m.strip() for m in match.groups()]
        new_text = clean[:match.start()].strip()
        new_text = re.sub(r'[-\s]+$', '', new_text)
        return new_text, opts
        
    # Try line by line fallback
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

test_cases = [
    "A .   $ { } ^ { n - 1 } C _ k $ B .   $ { } ^ n C _ k $   C .   $ { } ^ n   C _ { k + 1 } $ D .   N o n e",
    "Some question text here.\nA. Option 1\nB. Option 2\nC. Option 3\nD. Option 4",
    "Question ? (A) 1 (B) 2 (C) 3 (D) 4"
]

for t in test_cases:
    q, o = extract_options(t)
    print("Q:", q)
    print("O:", o)
    print("---")
