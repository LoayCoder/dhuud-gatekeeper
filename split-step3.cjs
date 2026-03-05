const fs = require('fs');
const path = require('path');

const srcFile = 'src/pages/incidents/IncidentReport/Step3Details.tsx';
const targetDir = 'src/pages/incidents/IncidentReport';

let content = fs.readFileSync(srcFile, 'utf8');

const incidentDetailsStart = content.indexOf('/* Incident: Severity & Actions */');
const reportAgainstContractorStart = content.indexOf('{/* Report Against Contractor - For BOTH Incidents AND Observations */}');

if (incidentDetailsStart > -1 && reportAgainstContractorStart > -1) {
    let subBlock = content.slice(incidentDetailsStart, reportAgainstContractorStart);

    let newImports = `import React from 'react';
import { FormField, FormItem, FormLabel, FormDescription, FormControl, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { HSSE_SEVERITY_LEVELS, calculateMinimumSeverity, isSeverityBelowMinimum, type SeverityLevelV2 } from '@/lib/hsse-severity-levels';

export function Step3IncidentDetails({ viewProps }: { viewProps: any }) {
  const { t, direction, form, eventType } = viewProps;
  return (
    ${subBlock.trim()}
  );
}
`;

    fs.writeFileSync(path.join(targetDir, 'Step3IncidentDetails.tsx'), newImports);

    content = content.replace(subBlock, '<Step3IncidentDetails viewProps={viewProps} />\n              ');
    content = "import { Step3IncidentDetails } from './Step3IncidentDetails';\n" + content;
    fs.writeFileSync(srcFile, content);

    console.log('Step3Details split successful.');
} else {
    console.log('Could not find split bounds.');
}
