const fs = require('fs');

try {
    let content = fs.readFileSync('src/locales/en/translation.json', 'utf8');
    let output = '';
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (inString) {
            if (escape) {
                escape = false;
            } else if (char === '\\') {
                escape = true;
            } else if (char === '"') {
                inString = false;
            }
            output += char;
        } else {
            if (char === '"') {
                inString = true;
                output += char;
            } else if (char === '{') {
                depth++;
                output += char;
            } else if (char === '}') {
                // Check if this closes the root
                if (depth === 1) {
                    // Check if there is more content after this
                    const remaining = content.substring(i + 1);
                    if (remaining.trim().length > 0) {
                        // Premature closure! Replace with comma.
                        // But careful: if the next char is ALREADY a comma, don't add another.
                        // Also, preserving formatting is hard.
                        // But usually '},' -> ',' is safe.
                        // If just '}', -> ','.
                        console.log(`Fixing premature root closure at approx position ${i}`);
                        output += ',';
                        // Do NOT decrement depth, because we kept it open.
                        continue;
                    }
                }
                depth--;
                output += char;
            } else {
                output += char;
            }
        }
    }

    // Post-processing: remove double commas if any (e.g. if original was }, and replaced } with , => ,,)
    // Actually, standard JSON doesn't allow ,,
    // My logic above: if char is '}', replace with ','.
    // If original was `},`, then result is `,,`.
    // So I should check if next non-whitespace char is comma.
    // Or simpler: replace `,,` with `,` in the final passes? No, dangerous inside strings.

    // Better logic: traverse and buffer.
    // If I encounter `}` at depth 1 with remaining content:
    // Skip this `}`.
    // Check if next non-whitespace char is NOT `,`.
    // If not comma, add `,`.
    // If comma, keep it (and it effectively serves as the separator).

    // Re-write loop with this better logic.

    depth = 0;
    inString = false;
    escape = false;
    let newContent = '';

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (inString) {
            if (escape) escape = false;
            else if (char === '\\') escape = true;
            else if (char === '"') inString = false;
            newContent += char;
            continue;
        }

        if (char === '"') {
            inString = true;
            newContent += char;
        } else if (char === '{') {
            depth++;
            newContent += char;
        } else if (char === '}') {
            if (depth === 1) {
                const remaining = content.substring(i + 1);
                if (remaining.trim().length > 0) {
                    console.log(`Removing premature '}' at position ${i}`);
                    // Don't add '}' to newContent.
                    // Check if we need to insert a comma?
                    // The next char might be newline, then "key".
                    // If original was `}, "key"`, then we stripped `}` -> `, "key"`.
                    // If original was `} "key"`, then we need comma -> `, "key"`.

                    // Let's verify if next meaningful char is comma.
                    let j = i + 1;
                    while (j < content.length && /\s/.test(content[j])) j++;
                    if (j < content.length && content[j] !== ',') {
                        newContent += ',';
                    }
                    // Current depth stays 1.
                    continue;
                }
            }
            depth--;
            newContent += char;
        } else {
            newContent += char;
        }
    }

    // Check if final depth is > 0 (meaning we removed closures but didn't close at end?)
    // If we removed closure at 1490 and 1779...
    // The file MUST end with '}' to close the root.
    // If original file had a final `}` at EOF, we keep it (depth goes to 0 there).
    // If original file was valid chunks `{} {}`, last one ends with `}`.
    // My loop will keep the LAST `}` because remaining.trim().length will be 0.
    // So valid.

    fs.writeFileSync('src/locales/en/translation.json', newContent, 'utf8');
    console.log('File fixed.');

} catch (err) {
    console.error(err);
}
