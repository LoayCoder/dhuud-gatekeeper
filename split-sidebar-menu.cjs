const fs = require('fs');
const path = require('path');

const srcFile = 'src/components/layout/AppSidebar.tsx';
const targetDir = 'src/components/layout/sidebar/menu';

let content = fs.readFileSync(srcFile, 'utf8');

const startStr = "  const menuItems = [";
const startIdx = content.indexOf(startStr);
const endStr = "  // Recursive function to filter menu items at any depth";
const endIdx = content.indexOf(endStr);

if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find menuItems array");
    process.exit(1);
}

const arrayContentStr = content.substring(startIdx + startStr.length, endIdx);

// Brace counting parser
let items = [];
let currentItem = "";
let braceCount = 0;
let inString = false;
let stringChar = '';

for (let i = 0; i < arrayContentStr.length; i++) {
    const char = arrayContentStr[i];
    const nextChar = arrayContentStr[i + 1];

    // Check if we hit the end of the array `];`
    if (braceCount === 0 && char === ']' && arrayContentStr[i + 1] === ';') {
        break;
    }

    if (!inString && (char === "'" || char === '"' || char === '\`')) {
        inString = true;
        stringChar = char;
        currentItem += char;
        continue;
    }

    if (inString && char === stringChar && arrayContentStr[i - 1] !== '\\') {
        inString = false;
        currentItem += char;
        continue;
    }

    if (!inString) {
        if (char === '{') {
            braceCount++;
        } else if (char === '}') {
            braceCount--;
        }
    }

    currentItem += char;

    if (!inString && braceCount === 0 && currentItem.trim().endsWith('}')) {
        // Find the next comma to skip it, or if it's the end
        let j = i + 1;
        while (j < arrayContentStr.length && (arrayContentStr[j] === ' ' || arrayContentStr[j] === '\\n' || arrayContentStr[j] === '\\r')) {
            j++;
        }
        if (arrayContentStr[j] === ',') {
            i = j; // skip the comma
            currentItem += ',';
        }

        if (currentItem.trim().length > 0) {
            items.push(currentItem);
        }
        currentItem = "";
    }
}

console.log(`Found ${items.length} top-level menu items`);

// Group items to ensure no file exceeds ~300 lines
// We will output them as separate React hooks: useAdminMenu, useHsseMenu, etc.

const imports = `import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  Shield, LayoutDashboard, FileWarning, ClipboardCheck, Users, Settings, Settings2, Building2,
  Trophy, Network, Layers, FolderTree, HelpCircle, LifeBuoy, CreditCard, Receipt, Puzzle, FileStack,
  BarChart3, ShieldAlert, ShieldCheck, FileCog, Package, List, Plus, QrCode, ClipboardList, Menu,
  Workflow, Clock, Radio, Calendar, MapPin, Briefcase, UserCheck, Route, Video, FileKey, HardHat,
  Map, Download, Share, CheckCircle2, MessageSquare, FileText, Bell, AlertTriangle, Globe, Languages,
  GraduationCap, BookOpen, History, Sparkles, Award
} from "lucide-react";
\n`;

function createHookFile(name, hookName, itemList) {
    const body = `export function ${hookName}() {
  const { t } = useTranslation();
  const location = useLocation();
  
  return [
${itemList.join('\\n')}
  ];
}\n`;
    fs.writeFileSync(path.join(targetDir, name + '.ts'), imports + body);
    console.log(`Created ${name}.ts with ${itemList.length} items`);
}

// Group 1: Core (Items 0, 1) - Dashboard, Leaderboard
// Group 2: HSSE (Item 2) - HSSE Management (It's huge)
// Group 3: GatePasses (Items 3, 4) - My Gate Passes, Dept Gate Passes
// Group 4: Assets (Item 5) - Asset Management
// Group 5: ContractorsPTW (Items 6, 7) - Contractors, PTW
// Group 6: Admin (Item 8) - Administration
// Group 7: SupportSettings (Items 9, 10, 11) - Training, Support, Settings

createHookFile('useCoreMenu', 'useCoreMenu', [items[0], items[1]]);
createHookFile('useHsseMenu', 'useHsseMenu', [items[2]]);
createHookFile('useGatePassesMenu', 'useGatePassesMenu', [items[3], items[4]]);
createHookFile('useAssetMenu', 'useAssetMenu', [items[5]]);
createHookFile('useContractorsPTWMenu', 'useContractorsPTWMenu', [items[6], items[7]]);
createHookFile('useAdminMenu', 'useAdminMenu', [items[8]]);
createHookFile('useSupportSettingsMenu', 'useSupportSettingsMenu', [items[9], items[10], items[11]]);

const indexExports = `export * from './useCoreMenu';
export * from './useHsseMenu';
export * from './useGatePassesMenu';
export * from './useAssetMenu';
export * from './useContractorsPTWMenu';
export * from './useAdminMenu';
export * from './useSupportSettingsMenu';\n`;
fs.writeFileSync(path.join(targetDir, 'index.ts'), indexExports);

// Now update AppSidebar.tsx
const newSidebarImports = `import {\n  useCoreMenu,\n  useHsseMenu,\n  useGatePassesMenu,\n  useAssetMenu,\n  useContractorsPTWMenu,\n  useAdminMenu,\n  useSupportSettingsMenu\n} from './sidebar/menu';\n`;

// Insert the imports
content = content.replace("import { DHUUD_APP_ICON } from \"@/constants/branding\";", "import { DHUUD_APP_ICON } from \"@/constants/branding\";\n" + newSidebarImports);

// Replace the array definition
const newArrayDef = `  const coreMenu = useCoreMenu();
  const hsseMenu = useHsseMenu();
  const gatePassesMenu = useGatePassesMenu();
  const assetMenu = useAssetMenu();
  const contractorsPTWMenu = useContractorsPTWMenu();
  const adminMenu = useAdminMenu();
  const supportSettingsMenu = useSupportSettingsMenu();

  const menuItems = [
    ...coreMenu,
    ...hsseMenu,
    ...gatePassesMenu,
    ...assetMenu,
    ...contractorsPTWMenu,
    ...adminMenu,
    ...supportSettingsMenu,
  ];\n`;

content = content.replace(content.substring(startIdx, endIdx), newArrayDef);

fs.writeFileSync(srcFile, content);
console.log('AppSidebar menu extraction successful');
