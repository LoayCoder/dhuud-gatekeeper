import re

filename = 'src/locales/ar/translation.json'
try:
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        for i, line in enumerate(lines):
            if re.search(r'^\s+"security":', line) or re.search(r'^\s+"contractors":', line):
                print(f"Match at line {i+1}: {line.strip()}")
except Exception as e:
    print(f"Error: {e}")
