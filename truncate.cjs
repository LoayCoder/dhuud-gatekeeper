const fs = require('fs');
const file = 'src/pages/incidents/InvestigationWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

const endPattern = '  );\\n}';
const endPattern2 = '  );\\r\\n}';
let idx = content.lastIndexOf(endPattern);
if (idx === -1) {
    idx = content.lastIndexOf(endPattern2);
    if (idx !== -1) {
        content = content.substring(0, idx + endPattern2.length);
        fs.writeFileSync(file, content);
        console.log('Truncated using \\r\\n');
    } else {
        console.log('End pattern not found at all!');
    }
} else {
    content = content.substring(0, idx + endPattern.length);
    fs.writeFileSync(file, content);
    console.log('Truncated using \\n');
}
