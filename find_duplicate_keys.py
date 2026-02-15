
file_path = r"c:\Users\loays\impact-matrix\dhuud\dhuud-development-code\dhuud-gatekeeper\src\locales\ar\translation.json"
keys_to_find = ["\"contractorPortal\"", "\"accessControl\""]

found_lines = {}

with open(file_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        for key in keys_to_find:
            if key in line:
                if key not in found_lines:
                    found_lines[key] = []
                found_lines[key].append(i)

for key, lines in found_lines.items():
    print(f"{key}: {lines}")
