const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const allTsx = walk(srcDir);

const excludeFiles = [
    'PublicRequestPage',
    'CreatePermit',
    'ProjectFormDialog',
    'ManhoursDialog',
    'QuickIncidentReport'
];

let mediumCandidates = [];

for (const file of allTsx) {
    const content = fs.readFileSync(file, 'utf8');

    // Must NOT have react-hook-form
    if (content.includes('react-hook-form') || content.includes('useForm(')) {
        continue;
    }

    // Check if it's excluded
    if (excludeFiles.some(ex => file.includes(ex))) {
        continue;
    }

    // Rough check for input fields (Input, Select, Textarea)
    const inputs = (content.match(/<Input/g) || []).length;
    const selects = (content.match(/<Select /g) || []).length;
    const textareas = (content.match(/<Textarea/g) || []).length;
    let checkboxes = (content.match(/<Checkbox/g) || []).length;
    const switches = (content.match(/<Switch/g) || []).length;

    const totalFields = inputs + selects + textareas + checkboxes + switches;

    // Filter to 4-10
    if (totalFields >= 4 && totalFields <= 15) { // broad range initially
        // Exclude multi-step (rough check)
        if (content.includes('step ===') || content.includes('setStep(') || content.includes('<Tabs') || content.includes('<Wizard')) {
            // maybe exclude? Let's just flag it for now
        }

        mediumCandidates.push({
            file: file.replace(srcDir, ''),
            totalFields,
            hasUploads: content.includes('type="file"') || content.includes('PhotoCapture') || content.includes('FileUp'),
            hasDynamic: content.includes('&& <') || content.includes('? <'),
            hasSupabase: content.includes('supabase.'),
            content: content
        });
    }
}

console.log(JSON.stringify(mediumCandidates.map(c => ({
    file: c.file,
    fields: c.totalFields,
    hasUploads: c.hasUploads,
    hasSupabase: c.hasSupabase
})), null, 2));
