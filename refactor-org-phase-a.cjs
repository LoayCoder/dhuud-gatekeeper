const fs = require('fs');
const path = require('path');

const targetDir = 'src/pages/admin/OrgStructure';
const tabsDir = path.join(targetDir, 'tabs');
const hooksDir = path.join(targetDir, 'hooks');

if (!fs.existsSync(tabsDir)) fs.mkdirSync(tabsDir, { recursive: true });
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

// === PART 1: SPLIT OrgStructureTabs.tsx ===
const tabsFile = path.join(targetDir, 'OrgStructureTabs.tsx');
if (fs.existsSync(tabsFile)) {
    const content = fs.readFileSync(tabsFile, 'utf8');

    // Common Header imports
    const headerLines = [];
    const lines = content.split('\n');
    let i = 0;
    for (; i < lines.length; i++) {
        if (lines[i].trim().startsWith('export function')) break;
        headerLines.push(lines[i]);
    }
    const headerStr = headerLines.join('\n');

    // Extract each function block
    const fileRegex = /export function ([A-Za-z0-9_]+)Tab\s*\([^]*?\)\s*\{[\s\S]*?(?=\nexport function|$)/g;
    let match;
    let tabExports = [];

    while ((match = fileRegex.exec(content)) !== null) {
        const fnName = match[1] + 'Tab';
        const block = match[0];

        // We need to write this to tabs/FunctionName.tsx
        const newFileContent = headerStr + '\n' + block;
        fs.writeFileSync(path.join(tabsDir, fnName + '.tsx'), newFileContent);
        tabExports.push(fnName);
    }

    // Rewrite OrgStructureTabs.tsx to simply be an index re-exporter
    let newTabsContent = tabExports.map(name => `export { ${name} } from './tabs/${name}';`).join('\n');
    fs.writeFileSync(tabsFile, newTabsContent);
}

// === PART 2: Extract useOrgStructure.ts ===
const mainFile = path.join(targetDir, 'OrgStructure.tsx');
if (fs.existsSync(mainFile)) {
    let mainContent = fs.readFileSync(mainFile, 'utf8');

    // We need to move all state into useOrgStructure
    // From: `export default function OrgStructure() {`
    // To: `const viewProps = { ... }`

    const fnStartIdx = mainContent.indexOf('export default function OrgStructure() {');
    const viewPropsIdx = mainContent.indexOf('const viewProps = {');

    if (fnStartIdx > -1 && viewPropsIdx > -1) {
        const beforeFn = mainContent.slice(0, fnStartIdx);
        const innerFnSetup = mainContent.slice(fnStartIdx + 'export default function OrgStructure() {'.length, viewPropsIdx);
        const afterProps = mainContent.slice(viewPropsIdx);

        // The inner setup has the state, useEffects, and functions. But we need to make sure we include the imports that it uses inside the hook file.
        let hookImports = `import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/use-user-roles";
import { useBranchFilter } from "@/hooks/use-branch-filter";
import { Branch, Division, Department, Section, Coordinate, Site, Building, FloorZone, TableType } from './types';
`;

        // Hook body
        let hookBody = `
export function useOrgStructure() {
${innerFnSetup}

  // The hook returns the viewProps
  return {
    t, direction, canDelete, branches, divisions, departments, sections, sites, buildings, floorsZones,
    newItemName, setNewItemName, parentId, setParentId, creating, newBranchLocation, setNewBranchLocation,
    newBranchLatitude, setNewBranchLatitude, newBranchLongitude, setNewBranchLongitude, getCurrentLocation,
    gettingLocation, handleCreate, editingId, editingName, setEditingName, editingLatitude, setEditingLatitude,
    editingLongitude, setEditingLongitude, handleUpdate, cancelEditing, saving, startEditing, handleDelete,
    openInMaps, selectedBranchForDivision, setSelectedBranchForDivision, divisionBranchFilter, setDivisionBranchFilter,
    selectedBranchForDepartment, setSelectedBranchForDepartment, filteredDivisionsForDropdown,
    selectedBranchForSection, setSelectedBranchForSection, departmentBranchFilter, setDepartmentBranchFilter,
    filteredDepartmentsForDropdown, sectionBranchFilter, setSectionBranchFilter, newSiteLatitude, setNewSiteLatitude,
    newSiteLongitude, setNewSiteLongitude, gettingSiteLocation, setGettingSiteLocation, localBranchFilter,
    setLocalBranchFilter, siteSearchQuery, setSiteSearchQuery, filteredBranchesForDropdown, setSelectedSite,
    setSiteDialogOpen, selectedSiteForBuilding, setSelectedSiteForBuilding, filteredSitesForDropdown,
    newBuildingNameAr, setNewBuildingNameAr, selectedBuildingForFloor, setSelectedBuildingForFloor,
    filteredBuildingsForDropdown, newFloorZoneNameAr, setNewFloorZoneNameAr, newLevelNumber, setNewLevelNumber,
    renderBranchRow, renderSimpleRow, renderRowWithParent, renderSiteRow, loading, branchLoading
  };
}
`;
        // We must pass renderBranchRow, renderSimpleRow, renderRowWithParent, renderSiteRow
        // Wait, renderBranchRow and others return JSX. So the hook needs React imports for TableRow, etc.
        // It's better to keep render tables inside OrgStructure.tsx, OR add `import React from 'react';` to the hook and UI imports to the hook.
        // It's easier to add UI imports to the hook.
        hookImports += `import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableRow, TableCell } from "@/components/ui/table";
import { Check, X, Pencil, Trash2, MapPin } from "lucide-react";
`;

        // Write hook
        fs.writeFileSync(path.join(hooksDir, 'useOrgStructure.tsx'), hookImports + hookBody);

        // Update mainFile
        let newMainContent = beforeFn + `import { useOrgStructure } from './hooks/useOrgStructure';\n\nexport default function OrgStructure() {\n  const viewProps = useOrgStructure();\n  const { loading, branchLoading, t, direction } = viewProps;\n\n  if (loading || branchLoading) {\n    return (\n      <div className="p-8 flex justify-center">\n        <Loader2 className="h-8 w-8 animate-spin text-primary" />\n      </div>\n    );\n  }\n\n` + mainContent.slice(mainContent.indexOf('return (', viewPropsIdx));

        // Check if loaders are imported in newMainContent, else add it
        if (!newMainContent.includes('import { Loader2 }')) {
            // it's imported at the top
        }

        fs.writeFileSync(mainFile, newMainContent);
    }
}

console.log('Phase A Extraction Complete');
