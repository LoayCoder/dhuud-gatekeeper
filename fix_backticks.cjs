const fs = require('fs');
const files = [
    'src/services/contractors/materialGatePassesService.ts',
    'src/services/contractors/workerAssignmentService.ts',
    'src/services/incidents/hsse-workflowService.ts',
    'src/services/incidents/investigationService.ts'
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    // replace \` with `
    content = content.replace(/\\`/g, '`');
    // replace \${ with ${
    content = content.replace(/\\\${/g, '${');
    fs.writeFileSync(file, content);
    console.log(`Fixed ${file}`);
}
