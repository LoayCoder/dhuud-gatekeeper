const fs = require('fs');
const path = require('path');

const srcFile = 'src/pages/incidents/MyActions/hooks/useMyActions.ts';
const targetFile = 'src/pages/incidents/MyActions/hooks/useMyActionsFilters.ts';

let content = fs.readFileSync(srcFile, 'utf8');

// Fix the empty "const" lines
content = content.replace(/\\s+const\\s*\\n/g, '\\n');
// Also some stray consts at the end of the previous string
content = content.replace("  const \\n  const \\n  const \\n", "");

const startString = "  const pendingActions = allActions?.filter(a => a.status === 'assigned' || a.status === 'pending' || a.status === 'returned_for_correction') || [];";
const endString = "  const isLoading = actionsLoading || inspectionActionsLoading || witnessLoading;";

const startIdx = content.indexOf(startString);
const endIdx = content.indexOf(endString);

if (startIdx !== -1 && endIdx !== -1) {
    const extractedCode = content.substring(startIdx, endIdx);

    const filtersImports = "export function useMyActionsFilters({\n" +
        "  allActions,\n" +
        "  searchQuery,\n" +
        "  priorityFilter,\n" +
        "  activeFilter\n" +
        "}: {\n" +
        "  allActions: any[];\n" +
        "  searchQuery: string;\n" +
        "  priorityFilter: string;\n" +
        "  activeFilter: string | null;\n" +
        "}) {\n\n" +
        extractedCode +
        "  return {\n" +
        "    pendingActions,\n" +
        "    inProgressActions,\n" +
        "    awaitingVerificationActions,\n" +
        "    closedActions,\n" +
        "    overdueActions,\n" +
        "    soonOverdueActions,\n" +
        "    displayedActiveActions,\n" +
        "    displayedClosedActions\n" +
        "  };\n" +
        "}\n";

    fs.writeFileSync(targetFile, filtersImports);

    // Call it in useMyActions
    const hookCall = "  const {\n" +
        "    pendingActions,\n" +
        "    inProgressActions,\n" +
        "    awaitingVerificationActions,\n" +
        "    closedActions,\n" +
        "    overdueActions,\n" +
        "    soonOverdueActions,\n" +
        "    displayedActiveActions,\n" +
        "    displayedClosedActions\n" +
        "  } = useMyActionsFilters({\n" +
        "    allActions,\n" +
        "    searchQuery,\n" +
        "    priorityFilter,\n" +
        "    activeFilter\n" +
        "  });\n\n";

    content = content.replace(extractedCode, hookCall);
    content = "import { useMyActionsFilters } from './useMyActionsFilters';\n" + content;

    // Clean up empty const lines again just in case
    content = content.split('\\n').filter(line => line.trim() !== 'const').join('\\n');

    fs.writeFileSync(srcFile, content);
    console.log('Filters hook split successfully');
} else {
    console.log('Failed to match filters start/end strings');
}
