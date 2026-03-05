const fs = require('fs');

const file = 'src/pages/incidents/InvestigationWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Truncate garbage
const endStr1 = '  );\\n}';
const endStr2 = '  );\\r\\n}';
let endIdx = content.lastIndexOf(endStr1);
if (endIdx === -1) endIdx = content.lastIndexOf(endStr2);

if (endIdx !== -1) {
    // Keep up to the closing brace
    content = content.substring(0, endIdx + (content.includes(endStr2) ? endStr2.length : endStr1.length)) + '\\n';
    console.log('Truncated garbage at end');
} else {
    console.log('Could not find end of component!');
}

// 2. Extract banners
const sStr = '          {/* Warning if investigation not yet allowed */}';
const eStr = '          {/* Investigation Sections - Modern Single-Page Layout */}';

const sIdx = content.indexOf(sStr);
const eIdx = content.indexOf(eStr);

if (sIdx !== -1 && eIdx !== -1) {
    const replacement = `          <InvestigationWorkspaceBanners
            investigationAllowed={investigationAllowed}
            editAccess={editAccess}
            setShowReopenDialog={setShowReopenDialog}
          />
\\n`;

    content = content.substring(0, sIdx) + replacement + content.substring(eIdx);
    console.log('Banners replaced');

    // 3. Add import
    const lastImportIdx = content.lastIndexOf('import');
    const nextNewline = content.indexOf('\\n', lastImportIdx);
    content = content.substring(0, nextNewline + 1) + 'import { InvestigationWorkspaceBanners } from "./InvestigationWorkspace/components/InvestigationWorkspaceBanners";\\n' + content.substring(nextNewline + 1);

    fs.writeFileSync(file, content);
    console.log('Saved successfully!');
} else {
    console.log('Banners block not found! sIdx:', sIdx, 'eIdx:', eIdx);
}
