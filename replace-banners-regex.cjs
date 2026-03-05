const fs = require('fs');

const file = 'src/pages/incidents/InvestigationWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\\s*\\{\\/\\* Warning if investigation not yet allowed \\*\\/\\}[\\s\\S]*?\\{\\/\\* Closed incident banner with reopen option \\*\\/\\}[\\s\\S]*?Reopen Investigation'\\)\\}\\s*<\\/Button >\\s *\\) \\}\\s *<\\/AlertDescription>\\s*<\\/Alert >\\s *\\) \\}/m;

const replacement = `
          <InvestigationWorkspaceBanners
            investigationAllowed={investigationAllowed}
            editAccess={editAccess}
            setShowReopenDialog={setShowReopenDialog}
          />`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);

    // Add import
    const lastImportIdx = content.lastIndexOf('import');
    const nextNewline = content.indexOf('\\n', lastImportIdx);
    content = content.substring(0, nextNewline + 1) + 'import { InvestigationWorkspaceBanners } from "./InvestigationWorkspace/components/InvestigationWorkspaceBanners";\\n' + content.substring(nextNewline + 1);

    fs.writeFileSync(file, content);
    console.log('Regex replace successful!');
} else {
    console.log('Regex did not match anything!');
}
