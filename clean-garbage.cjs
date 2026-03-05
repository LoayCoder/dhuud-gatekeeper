const fs = require('fs');
const file = 'src/pages/incidents/InvestigationWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\\n');
// Keep only up to line 470 (index 469)
const cleanLines = lines.slice(0, 470);
fs.writeFileSync(file, cleanLines.join('\\n'));
console.log('Garbage removed. Lines:', cleanLines.length);
