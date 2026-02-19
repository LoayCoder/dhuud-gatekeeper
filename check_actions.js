
const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'src/locales/en/translation.json');
const arPath = path.join(__dirname, 'src/locales/ar/translation.json');

function checkFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const json = JSON.parse(data);

        if (json.actions) {
            console.log(`[${path.basename(filePath)}] 'actions' key EXISTS.`);
            console.log(`[${path.basename(filePath)}] 'actions.close': ${json.actions.close}`);
            console.log(`[${path.basename(filePath)}] keys in actions: ${Object.keys(json.actions).join(', ')}`);
        } else {
            console.log(`[${path.basename(filePath)}] 'actions' key DOES NOT exist.`);
        }
    } catch (e) {
        console.error(`[${path.basename(filePath)}] Error parsing JSON: ${e.message}`);
    }
}

checkFile(enPath);
checkFile(arPath);
