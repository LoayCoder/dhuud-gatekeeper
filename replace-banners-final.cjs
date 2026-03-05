const fs = require('fs');

const file = 'src/pages/incidents/InvestigationWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

const sIdx = content.indexOf('          {/* Warning if investigation not yet allowed */}');
const eIdx = content.indexOf('          {/* Investigation Sections - Modern Single-Page Layout */}');

if (sIdx !== -1 && eIdx !== -1) {
    const replacement = `          <InvestigationWorkspaceBanners
            investigationAllowed={investigationAllowed}
            editAccess={editAccess}
            setShowReopenDialog={setShowReopenDialog}
          />
\n`;

    content = content.substring(0, sIdx) + replacement + content.substring(eIdx);

    // Add import
    const lastImportIdx = content.lastIndexOf('import');
    const nextNewline = content.indexOf('\\n', lastImportIdx);
    content = content.substring(0, nextNewline + 1) + 'import { InvestigationWorkspaceBanners } from "./InvestigationWorkspace/components/InvestigationWorkspaceBanners";\\n' + content.substring(nextNewline + 1);

    fs.writeFileSync(file, content);
    console.log('Banners replaced by substring!');
} else {
    console.log('Banners start/end not found. s:', sIdx, 'e:', eIdx);
}
