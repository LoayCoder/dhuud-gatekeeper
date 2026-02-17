const fs = require('fs');
try {
    const content = fs.readFileSync('src/locales/en/translation.json', 'utf8');
    JSON.parse(content);
    console.log('Valid JSON');
} catch (e) {
    console.log(e.message);
    if (e.message.includes('position')) {
        const pos = parseInt(e.message.match(/position (\d+)/)[1]);
        console.log('Context around position ' + pos + ':');
        console.log(content.substring(pos - 50, pos + 50));
    }
}
