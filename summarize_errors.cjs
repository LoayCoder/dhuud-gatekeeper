const fs = require('fs');
const report = JSON.parse(fs.readFileSync('feature_eslint_report.json', 'utf8').replace(/^\uFEFF/, ''));
report.forEach(f => {
    if (f.errorCount > 0) {
        console.log('\n' + f.filePath);
        f.messages.filter(m => m.severity === 2).forEach(m => {
            console.log(  : [] );
        });
    }
});
