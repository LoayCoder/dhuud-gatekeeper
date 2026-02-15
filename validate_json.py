import json
import sys

file_path = "c:\\Users\\loays\\impact-matrix\\dhuud\\dhuud-development-code\\dhuud-gatekeeper\\src\\locales\\ar\\translation.json"

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        json.loads(content)
        print("JSON is valid.")
except json.JSONDecodeError as e:
    print(f"JSON Error: {e.msg}")
    print(f"Line: {e.lineno}")
    print(f"Column: {e.colno}")
    # Print context
    lines = content.splitlines()
    start = max(0, e.lineno - 5)
    end = min(len(lines), e.lineno + 5)
    for i in range(start, end):
        print(f"{i+1}: {lines[i]}")
except Exception as e:
    print(f"Error: {e}")
