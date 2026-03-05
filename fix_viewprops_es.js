import fs from 'fs';
import path from 'path';

export const executeTypeClean = () => {
    try {
        const filesToEdit = [
            'src/pages/incidents/MyActions/tabs/ActionsTab.tsx',
            'src/pages/incidents/MyActions/tabs/ApprovalsTab.tsx',
            'src/pages/incidents/MyActions/tabs/ContractorApprovalsList.tsx',
            'src/pages/incidents/MyActions/tabs/IncidentApprovalsList.tsx',
            'src/pages/incidents/MyActions/tabs/InspectionsTab.tsx',
            'src/pages/incidents/MyActions/tabs/InvestigationsTab.tsx',
            'src/pages/incidents/MyActions/tabs/ReportedTab.tsx',
            'src/pages/incidents/MyActions/tabs/WitnessTab.tsx',
            'src/pages/incidents/MyActions/MyActionsLayout.tsx'
        ];

        filesToEdit.forEach(file => {
            if (fs.existsSync(file)) {
                let content = fs.readFileSync(file, 'utf8');
                content = content.replace(
                    'viewProps: any /* eslint-disable-line @typescript-eslint/no-explicit-any */',
                    'viewProps: Record<string, unknown>'
                );
                content = content.replace(
                    '{ viewProps }: { viewProps: any }',
                    '{ viewProps }: { viewProps: Record<string, unknown> }'
                );
                content = content.replace(
                    /\{\s*viewProps\s*\}:\s*\{\s*viewProps:\s*any\s*\/\*\s*eslint-disable-line @typescript-eslint\/no-explicit-any\s*\*\/\s*\}/g,
                    '{ viewProps }: { viewProps: Record<string, unknown> }'
                );
                fs.writeFileSync(file, content, 'utf8');
                console.log(`Updated ${file}`);
            }
        });
    } catch (err) {
        console.error(err);
    }
}
executeTypeClean();
