const fs = require('fs');
const file = 'src/pages/incidents/InvestigationWorkspace.tsx';
const content = fs.readFileSync(file, 'utf8');

const lines = content.split(/\\r?\\n/);
const cleanLines = lines.slice(0, 471);

fs.writeFileSync(file, cleanLines.join('\\n'));
console.log('Fixed! Lines length:', cleanLines.length);
