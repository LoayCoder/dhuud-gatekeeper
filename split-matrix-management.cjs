const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'src/components/admin/NotificationMatrixManagement.tsx');
let content = fs.readFileSync(sourceFile, 'utf8');

const targetDir = path.join(__dirname, 'src/components/admin/NotificationMatrixManagement');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

const componentsDir = path.join(targetDir, 'components');
if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir, { recursive: true });

function extractBetween(str, startStr, endStr) {
    const startIdx = str.indexOf(startStr);
    if (startIdx === -1) return '';
    const restStr = str.substring(startIdx + startStr.length);
    const endIdx = restStr.indexOf(endStr);
    if (endIdx === -1) return restStr;
    return restStr.substring(0, endIdx);
}

// 1. types.ts
const typesCode = `import { StakeholderRole, EventType, NotificationMatrixRule } from '@/hooks/use-notification-matrix';

export interface RuleFormState {
  stakeholder_role: StakeholderRole | '';
  severity_from: string;
  severity_to: string;
  channels: string[];
  condition_type: string | null;
  user_id: string | null;
  isUserSpecific: boolean;
  whatsapp_template_id: string | null;
  email_template_id: string | null;
  push_template_id: string | null;
  event_type: EventType;
}
`;
fs.writeFileSync(path.join(targetDir, 'types.ts'), typesCode);

// 2. utils.ts
const utilsCode = `import { RuleFormState } from './types';

export const getInitialFormState = (): RuleFormState => ({
  stakeholder_role: '',
  severity_from: 'level_1',
  severity_to: 'level_5',
  channels: [],
  condition_type: null,
  user_id: null,
  isUserSpecific: false,
  whatsapp_template_id: null,
  email_template_id: null,
  push_template_id: null,
  event_type: 'incident',
});

// Severity level colors following HSSA standards
export const SEVERITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  level_1: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Low' },
  level_2: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', label: 'Moderate' },
  level_3: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'Serious' },
  level_4: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Major' },
  level_5: { bg: 'bg-red-200 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-300', label: 'Catastrophic' },
};
`;
fs.writeFileSync(path.join(targetDir, 'utils.ts'), utilsCode);

// 3. ChannelIcon.tsx
const channelIconImports = `import React from 'react';
import { Mail, MessageCircle, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
`;
const channelIconCode = extractBetween(content, '// Channel icon component\nconst ChannelIcon', '};\n');
fs.writeFileSync(path.join(componentsDir, 'ChannelIcon.tsx'), channelIconImports + '\nexport const ChannelIcon' + channelIconCode + '};\n');

// 4. RuleFormFields.tsx
const formFieldsImports = `import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Users, Mail, MessageCircle, Smartphone, ChevronRight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { STAKEHOLDER_ROLES, SEVERITY_LEVELS, CHANNELS, StakeholderRole } from '@/hooks/use-notification-matrix';
import { RuleFormState } from '../types';
import { SEVERITY_COLORS } from '../utils';
import { ChannelIcon } from './ChannelIcon';

export interface RuleFormFieldsProps {
  formState: RuleFormState;
  setFormState: React.Dispatch<React.SetStateAction<RuleFormState>>;
  users: any[];
  getRoleLabel: (role: string) => string;
  getSeverityLabel: (level: string) => string;
  emailTemplates: any[];
  whatsappTemplates: any[];
  pushTemplates: any[];
}

export function RuleFormFields({
  formState,
  setFormState,
  users,
  getRoleLabel,
  getSeverityLabel,
  emailTemplates,
  whatsappTemplates,
  pushTemplates
}: RuleFormFieldsProps) {
  const { t } = useTranslation();
  return (
`;
const formFieldsJSX = extractBetween(content, 'const renderFormFields = () => (', '  return (\n');
// the body of renderFormFields ends with `  );\n\n` before `  return (\n`
// wait, extractBetween will give me up to `  return (\n`, so the last part is `  );\n\n`.
fs.writeFileSync(path.join(componentsDir, 'RuleFormFields.tsx'), formFieldsImports + formFieldsJSX.trim() + '\n}\n');

// 5. RulesTable.tsx
const rulesTableImports = `import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Users, Pencil, Trash2, BellOff, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SEVERITY_LEVELS, CHANNELS, hasChannel, NotificationMatrixRule } from '@/hooks/use-notification-matrix';
import { RuleFormState } from '../types';
import { SEVERITY_COLORS } from '../utils';
import { ChannelIcon } from './ChannelIcon';

export interface RulesTableProps {
  groupedRules: Record<string, NotificationMatrixRule[]>;
  getUserName: (userId: string | null) => string;
  getRoleLabel: (role: string) => string;
  handleChannelToggle: (rule: NotificationMatrixRule, channel: string) => void;
  handleEditGroup: (groupKey: string) => void;
  handleDeleteGroup: (groupKey: string) => void;
  onAddFirstRule: () => void;
}

export function RulesTable({
  groupedRules,
  getUserName,
  getRoleLabel,
  handleChannelToggle,
  handleEditGroup,
  handleDeleteGroup,
  onAddFirstRule
}: RulesTableProps) {
  const { t } = useTranslation();
  return (
`;
const rulesTableJSX = extractBetween(content, '{Object.keys(groupedRules).length === 0 ? (', '</CardContent>');
// replace onAddFirstRule in the code
const patchedRulesTableJSX = rulesTableJSX
    .replace(/setFormState\(getInitialFormState\(\)\);\s*setShowAddDialog\(true\);/, 'onAddFirstRule();');

fs.writeFileSync(path.join(componentsDir, 'RulesTable.tsx'), rulesTableImports + '    {Object.keys(groupedRules).length === 0 ? (\n' + patchedRulesTableJSX + '\n  );\n}\n');

// 6. NotificationMatrixManagement.tsx
let shellContent = content
    .replace(/interface RuleFormState \{[\s\S]*?\}\n/, '')
    .replace(/const getInitialFormState = \(\): RuleFormState => \(\{[\s\S]*?\}\);\n/, '')
    .replace(/\/\/ Severity level colors following HSSA standards[\s\S]*?};\n/, '')
    .replace(/\/\/ Channel icon component[\s\S]*?};\n/, '')
    .replace(/const renderFormFields = \(\) => \([\s\S]*?\);\n\n  return \(/, 'return (')
    .replace(/\{Object\.keys\(groupedRules\)\.length === 0 \? \([\s\S]*?\n          \)}/,
        `<RulesTable
            groupedRules={groupedRules}
            getUserName={getUserName}
            getRoleLabel={getRoleLabel}
            handleChannelToggle={handleChannelToggle}
            handleEditGroup={handleEditGroup}
            handleDeleteGroup={handleDeleteGroup}
            onAddFirstRule={() => {
              setFormState(getInitialFormState());
              setShowAddDialog(true);
            }}
          />`)
    .replace(/\{renderFormFields\(\)\}/g,
        `<RuleFormFields
            formState={formState}
            setFormState={setFormState}
            users={users || []}
            getRoleLabel={getRoleLabel}
            getSeverityLabel={getSeverityLabel}
            emailTemplates={emailTemplates}
            whatsappTemplates={whatsappTemplates}
            pushTemplates={pushTemplates}
          />`);

// Insert imports into shellContent
const importInsertIdx = shellContent.lastIndexOf('import ');
const beforeImports = shellContent.substring(0, shellContent.indexOf('import', importInsertIdx) + 500); // just safe finding
const headerEnd = shellContent.indexOf('\n\n', shellContent.indexOf('import'));
shellContent = shellContent.substring(0, headerEnd) + `
import { RuleFormState } from './types';
import { getInitialFormState } from './utils';
import { RuleFormFields } from './components/RuleFormFields';
import { RulesTable } from './components/RulesTable';
` + shellContent.substring(headerEnd);

fs.writeFileSync(path.join(targetDir, 'NotificationMatrixManagement.tsx'), shellContent);
fs.writeFileSync(path.join(targetDir, 'index.ts'), "export { default } from './NotificationMatrixManagement';\n");

console.log('Split completed');
