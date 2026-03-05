const fs = require('fs');

const file = 'src/pages/incidents/InvestigationWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

const headerStart = '      <div className="space-y-6">';
const headerEndPattern = '        </div>\\n      </div>';

let s = content.indexOf(headerStart);
let e = content.indexOf(headerEndPattern);

if (s !== -1 && e !== -1) {
    const replacement = `      <InvestigationWorkspaceHeader
        selectedIncidentId={selectedIncidentId}
        selectedIncident={selectedIncident}
        incidentData={incidentData}
        slaInfo={slaInfo}
        onBack={() => {
          setSelectedIncidentId(null);
          navigate('/incidents/investigate');
        }}
        onRefresh={handleRefresh}
        onCloseOnSpot={() => setShowCloseOnSpotDialog(true)}
      />`;

    // e represents start of the match string, we need to add the length. But note the match string is 2 lines.
    // Length of match string is 23
    content = content.substring(0, s) + replacement + content.substring(e + headerEndPattern.length);

    // Add import
    const lastImportIdx = content.lastIndexOf('import');
    const nextNewline = content.indexOf('\\n', lastImportIdx);
    content = content.substring(0, nextNewline + 1) + 'import { InvestigationWorkspaceHeader } from "./InvestigationWorkspace/components/InvestigationWorkspaceHeader";\\n' + content.substring(nextNewline + 1);

    fs.writeFileSync(file, content);
    console.log('Header replaced!');
} else {
    console.log('Header start/end not found. s:', s, 'e:', e);
}
