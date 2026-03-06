const fs = require('fs');
const data = JSON.parse(fs.readFileSync('medium_forms.json', 'utf8'));

let out = [];

const domains = ['ADMIN', 'CONTRACTORS', 'SECURITY', 'ASSETS', 'AUTH', 'OTHER'];

let simpleCount = 0;
let complexCount = 0;
let totalCount = 0;

for (const domain of domains) {
    const subset = data.filter(d => d.domain === domain);
    if (subset.length === 0) continue;

    out.push(`## ${domain}`);
    out.push(`| # | File | Purpose | Fields | Uploads | Dynamic | Supabase | Cascading |`);
    out.push(`|---|------|---------|--------|---------|---------|----------|-----------|`);

    subset.forEach((s, idx) => {
        const isSimple = s.hasUploads === 'No' && s.hasDynamic === 'No' && s.hasSupabase === 'No';
        if (isSimple) simpleCount++; else complexCount++;
        totalCount++;

        // Clean up file path
        let file = s.file.replace(/\\/g, '/');
        if (file.startsWith('/')) file = file.substring(1);

        out.push(`| ${idx + 1} | \`${file}\` | ${s.purpose} | ${s.fields} | ${s.hasUploads} | ${s.hasDynamic} | ${s.hasSupabase} | ${s.hasCascading} |`);
    });
    out.push('');
}

out.push(`Summary at end:`);
out.push(`  Total MEDIUM forms: ${totalCount}`);
out.push(`  Simple (no uploads, no dynamic, no Supabase): ${simpleCount}`);
out.push(`  Complex (has any of the above): ${complexCount}`);

fs.writeFileSync('medium_forms_report.md', out.join('\n'));
console.log('Done');
