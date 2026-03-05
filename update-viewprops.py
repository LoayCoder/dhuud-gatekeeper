import os

files_to_edit = [
    'src/pages/incidents/MyActions/tabs/ActionsTab.tsx',
    'src/pages/incidents/MyActions/tabs/ApprovalsTab.tsx',
    'src/pages/incidents/MyActions/tabs/ContractorApprovalsList.tsx',
    'src/pages/incidents/MyActions/tabs/IncidentApprovalsList.tsx',
    'src/pages/incidents/MyActions/tabs/InspectionsTab.tsx',
    'src/pages/incidents/MyActions/tabs/InvestigationsTab.tsx',
    'src/pages/incidents/MyActions/tabs/ReportedTab.tsx',
    'src/pages/incidents/MyActions/tabs/WitnessTab.tsx',
    'src/pages/incidents/MyActions/MyActionsLayout.tsx'
]

for file_path in files_to_edit:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        # Replace the problematic any usage
        content = content.replace(
            'viewProps: any',
            'viewProps: Record<string, unknown>'
        )
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {file_path}")
