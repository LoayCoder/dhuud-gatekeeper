const fs = require('fs');
const path = require('path');

const reportPath = 'feature_eslint_report.json';
if (!fs.existsSync(reportPath)) {
    console.error('Report not found');
    process.exit(1);
}

const rawReport = fs.readFileSync(reportPath, 'utf8').replace(/^\uFEFF/, '');
const report = JSON.parse(rawReport);

report.forEach(fileReport => {
    if (fileReport.errorCount === 0 && fileReport.warningCount === 0) return;
    
    let filePath = fileReport.filePath;
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let lines = content.split('\n');
    let changed = false;

    // Apply fixes from bottom to top to preserve line/column numbers
    const messages = fileReport.messages.sort((a, b) => {
        if (a.line === b.line) return b.column - a.column;
        return b.line - a.line;
    });

    messages.forEach(msg => {
        const lineIdx = msg.line - 1;
        if (lineIdx < 0 || lineIdx >= lines.length) return;
        
        let l = lines[lineIdx];

        if (msg.ruleId === '@typescript-eslint/no-explicit-any') {
            const colIdx = msg.column - 1;
            
            // Look for "any" starting at colIdx
            const anyMatch = l.slice(colIdx).match(/^any\b/);
            if (anyMatch) {
                const before = l.slice(0, colIdx);
                const after = l.slice(colIdx + 3);
                
                // If it's s any, replace with s unknown
                if (before.match(/\bas\s+$/)) {
                    l = before + 'unknown' + after;
                    changed = true;
                } 
                // If it's : any, replace with : unknown
                else if (before.match(/:\s*$/)) {
                    l = before + 'unknown' + after;
                    changed = true;
                }
            } else {
                // fallback
                if (l.includes(': any')) {
                    l = l.replace(/: any\b/g, ': unknown');
                    changed = true;
                } else if (l.includes('as any')) {
                    l = l.replace(/\bas any\b/g, 'as unknown');
                    changed = true;
                }
            }
        } 
        else if (msg.ruleId === 'react/no-unescaped-entities') {
            if (l.includes("don't")) { l = l.replace(/don't/g, "don&apos;t"); changed = true; }
            if (l.includes("Don't")) { l = l.replace(/Don't/g, "Don&apos;t"); changed = true; }
            if (l.includes("it's")) { l = l.replace(/it's/g, "it&apos;s"); changed = true; }
            if (l.includes("It's")) { l = l.replace(/It's/g, "It&apos;s"); changed = true; }
            if (l.includes("can't")) { l = l.replace(/can't/g, "can&apos;t"); changed = true; }
            if (l.includes("Can't")) { l = l.replace(/Can't/g, "Can&apos;t"); changed = true; }
            if (l.includes("you're")) { l = l.replace(/you're/g, "you&apos;re"); changed = true; }
            if (l.includes("You're")) { l = l.replace(/You're/g, "You&apos;re"); changed = true; }
            if (l.includes("I'm")) { l = l.replace(/I'm/g, "I&apos;m"); changed = true; }
            if (l.includes("we're")) { l = l.replace(/we're/g, "we&apos;re"); changed = true; }
            if (l.includes("We're")) { l = l.replace(/We're/g, "We&apos;re"); changed = true; }
            if (l.includes("let's")) { l = l.replace(/let's/g, "let&apos;s"); changed = true; }
            if (l.includes("Let's")) { l = l.replace(/Let's/g, "Let&apos;s"); changed = true; }
            if (l.includes("that's")) { l = l.replace(/that's/g, "that&apos;s"); changed = true; }
            if (l.includes("That's")) { l = l.replace(/That's/g, "That&apos;s"); changed = true; }
            
            // If it wasn't one of the common ones, try to escape any unmatched apostrophe 
            // (crude but effective for JSX text)
            if (!changed && l.match(/>([^<]*?)'([^<]*?)</)) {
                l = l.replace(/>([^<]*?)'([^<]*?)</g, ">&apos;<");
                changed = true;
            }
            if (!changed && l.match(/>([^<]*?)"([^<]*?)</)) {
                l = l.replace(/>([^<]*?)"([^<]*?)</g, ">&quot;<");
                changed = true;
            }
            if (!changed) {
                // just escape single quotes inside text generically
                l = l.replace(/'/g, "&apos;");
                changed = true;
            }
        }
        else if (msg.ruleId === 'no-useless-escape') {
            l = l.replace(/\\([()[\]{}.?!*+^$|\\])/g, ''); // crude un-escape
            changed = true;
        }
        else if (msg.ruleId === 'prefer-const') {
            l = l.replace(/\blet\b/, 'const');
            changed = true;
        }
        
        lines[lineIdx] = l;
    });

    if (changed) {
        fs.writeFileSync(filePath, lines.join('\n'));
        console.log('Fixed', filePath);
    }
});
