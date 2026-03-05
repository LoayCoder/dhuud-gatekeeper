import os
import glob
import re
from collections import Counter

def scan_suppressions():
    pattern = re.compile(r'eslint-disable(-line|-next-line)?\s+([@a-zA-Z0-9/-]+)', re.IGNORECASE)
    counts = Counter()
    
    src_dir = 'src'
    for root, _, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.ts') or file.endswith('.tsx'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    matches = pattern.findall(content)
                    if matches:
                        counts[filepath] += len(matches)
                        
    print("Files with remaining suppressions:")
    for filepath, count in counts.most_common(20):
        print(f"{filepath}: {count}")

if __name__ == '__main__':
    scan_suppressions()
