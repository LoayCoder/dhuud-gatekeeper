const fs = require('fs');

const file = 'src/pages/incidents/InvestigationWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

const lines = content.split('\\n');

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

lines.splice(246, 78, replacement);

content = lines.join('\\n');

const lastImportIdx = content.lastIndexOf('import');
const nextNewline = content.indexOf('\\n', lastImportIdx);
content = content.substring(0, nextNewline + 1) + 'import { InvestigationWorkspaceHeader } from "./InvestigationWorkspace/components/InvestigationWorkspaceHeader";\\n' + content.substring(nextNewline + 1);

fs.writeFileSync(file, content);
console.log('Header replaced by lines!');
