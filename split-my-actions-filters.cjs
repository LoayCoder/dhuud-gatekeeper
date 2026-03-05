const fs = require('fs');
const path = require('path');

const srcFile = 'src/pages/incidents/MyActions/hooks/useMyActions.ts';
const targetFile = 'src/pages/incidents/MyActions/hooks/useMyActionsFilters.ts';

let content = fs.readFileSync(srcFile, 'utf8');

// The chunk starting from `const pendingActions =` to `const displayedClosedActions =`
const startString = "  const pendingActions = allActions?.filter(a => a.status === 'assigned' || a.status === 'pending' || a.status === 'returned_for_correction') || [];";
const endString = "  const totalExtensions =";

const startIdx = content.indexOf(startString);
const endIdx = content.indexOf(endString);

if (startIdx !== -1 && endIdx !== -1) {
    const extractedCode = content.substring(startIdx, endIdx);

    const filtersImports = `export function useMyActionsFilters({\n` +
        `  allActions,\n` +
        `  searchQuery,\n` +
        `  priorityFilter,\n` +
        `  activeFilter\n` +
        `}: {\n` +
        `  allActions: any[];\n` +
        `  searchQuery: string;\n` +
        `  priorityFilter: string;\n` +
        `  activeFilter: string | null;\n` +
        `}) {\n\n` +
        `  ${extractedCode}\n` +
        `  return {\n` +
        `    pendingActions,\n` +
        `    inProgressActions,\n` +
        `    awaitingVerificationActions,\n` +
        `    closedActions,\n` +
        `    overdueActions,\n` +
        `    soonOverdueActions,\n` +
        `    displayedActiveActions,\n` +
        `    displayedClosedActions\n` +
        `  };\n` +
        `}\n`;

    fs.writeFileSync(targetFile, filtersImports);

    // Call it in useMyActions
    const hookCall = `  const {\n` +
        `    pendingActions,\n` +
        `    inProgressActions,\n` +
        `    awaitingVerificationActions,\n` +
        `    closedActions,\n` +
        `    overdueActions,\n` +
        `    soonOverdueActions,\n` +
        `    displayedActiveActions,\n` +
        `    displayedClosedActions\n` +
        `  } = useMyActionsFilters({\n` +
        `    allActions,\n` +
        `    searchQuery,\n` +
        `    priorityFilter,\n` +
        `    activeFilter\n` +
        `  });\n\n`;

    content = content.replace(extractedCode, hookCall);
    content = `import { useMyActionsFilters } from './useMyActionsFilters';\n` + content;

    fs.writeFileSync(srcFile, content);
    console.log('Filters hook split successfully');

} else {
    console.log('Failed to match filters start/end strings');
}
