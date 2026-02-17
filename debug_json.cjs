const fs = require('fs');

try {
    const content = fs.readFileSync('src/locales/en/translation.json', 'utf8');
    let depth = 0;
    let inString = false;
    let escape = false;
    let line = 1;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (char === '\n') {
            line++;
        }

        if (inString) {
            if (escape) {
                escape = false;
            } else if (char === '\\') {
                escape = true;
            } else if (char === '"') {
                inString = false;
            }
        } else {
            if (char === '"') {
                inString = true;
            } else if (char === '{') {
                depth++;
            } else if (char === '}') {
                depth--;
                if (depth === 0) {
                    console.log(`Root object closed at line ${line}, position ${i}`);
                    // Check if there is non-whitespace after
                    const remaining = content.substring(i + 1);
                    if (remaining.trim().length > 0) {
                        const preview = remaining.trim().substring(0, 50);
                        console.log(`ERROR: Content found after root closure: "${preview}..."`);
                        console.log(`Next non-whitespace char at line ${line + remaining.search(/\S/)} (approx)`);
                    } else {
                        console.log("File ends correctly (only whitespace after root closure).");
                    }
                    break;
                }
            }
        }
    }

    if (depth > 0) {
        console.log(`ERROR: JSON not closed. Final depth: ${depth}`);
    }

} catch (err) {
    console.error(err);
}
