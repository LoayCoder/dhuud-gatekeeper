const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (fullPath.endsWith('.tsx')) {
            results.push(fullPath);
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

let forms = [];

for (const file of allTsx) {
    const content = fs.readFileSync(file, 'utf8');

    // We want components with state
    if (!content.includes('useState')) continue;

    // Reject if react-hook-form
    if (content.match(/react-hook-form|useForm\(/i)) continue;

    // Reject if excluded
    if (excludeFiles.some(ex => file.includes(ex))) continue;

    // Identify form fields
    const inputs = (content.match(/<Input(\s|>)/g) || []).length;
    const selects = (content.match(/<Select(\s|>)/g) || []).length;
    const textareas = (content.match(/<Textarea(\s|>)/g) || []).length;
    const checkboxes = (content.match(/<Checkbox(\s|>)/g) || []).length;
    const switches = (content.match(/<Switch(\s|>)/g) || []).length;
    const datePickers = (content.match(/<DatePicker(\s|>)/g) || []).length;
    const timePickers = (content.match(/<TimePicker(\s|>)/g) || []).length;

    const totalFields = inputs + selects + textareas + checkboxes + switches + datePickers + timePickers;

    if (totalFields >= 4 && totalFields <= 10) {
        // Multi-step proxy
        if (content.includes('step ===') && content.includes('setStep')) continue;
        if (content.includes('<Tabs ') || content.includes('<Wizard')) continue;

        // Domain logic
        if (content.toLowerCase().includes('simops') || content.toLowerCase().includes('mobilization')) continue;

        const hasUploads = content.includes('type="file"') ||
            content.includes('PhotoCapture') ||
            content.includes('Upload') ||
            content.includes('VoiceMemo');

        const hasDynamic = content.match(/&&(\s+)?<[A-Z]/) !== null || content.match(/\?(\s+)?<[A-Z]/) !== null;

        const hasSupabase = content.includes('supabase.');

        const hasCascading = content.includes('onChange') && totalFields > 3 && selects >= 2; // rough heuristic

        let domain = 'OTHER';
        if (file.toLowerCase().includes('admin')) domain = 'ADMIN';
        else if (file.toLowerCase().includes('contractor')) domain = 'CONTRACTORS';
        else if (file.toLowerCase().includes('security') || file.toLowerCase().includes('visitor')) domain = 'SECURITY';
        else if (file.toLowerCase().includes('asset') || file.toLowerCase().includes('vehicle')) domain = 'ASSETS';
        else if (file.toLowerCase().includes('auth') || file.toLowerCase().includes('login')) domain = 'AUTH';

        const purposeMatch = content.match(/\/\/ Purpose: (.+)/);
        let purpose = purposeMatch ? purposeMatch[1] : `Manages ${path.basename(file, '.tsx')} data`;

        forms.push({
            file: file.replace(srcDir, ''),
            domain,
            purpose,
            fields: totalFields,
            hasUploads: hasUploads ? 'Yes' : 'No',
            hasDynamic: hasDynamic ? 'Yes' : 'No',
            hasSupabase: hasSupabase ? 'Yes' : 'No',
            hasCascading: hasCascading ? 'Yes' : 'No'
        });
    }
}

fs.writeFileSync('medium_forms.json', JSON.stringify(forms, null, 2));
console.log(`Found ${forms.length} forms`);
