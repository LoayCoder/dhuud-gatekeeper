import json

filename = 'src/locales/ar/translation.json'
try:
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Validation
    start_line = 12653
    end_line = 12788
    
    start_content = lines[start_line-1].strip()
    end_content = lines[end_line-1].strip()
    
    print(f"Line {start_line}: {start_content}")
    print(f"Line {end_line}: {end_content}")
    
    if '"security": {' in start_content and '},' in end_content:
        print("Verification successful. Removing lines...")
        new_lines = lines[:start_line-1] + lines[end_line:]
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        print("File updated.")
    else:
        print("Verification FAILED. Aborting.")

except Exception as e:
    print(f"Error: {e}")
