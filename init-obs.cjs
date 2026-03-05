const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'src/components/incidents/QuickObservationCard.tsx');
const content = fs.readFileSync(sourceFile, 'utf8');

const targetDir = path.join(__dirname, 'src/components/incidents/QuickObservationCard');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}
const hooksDir = path.join(targetDir, 'hooks');
if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
}

// Extract imports
const importsMatch = content.match(/^(import[\s\S]*?(?=\nconst OBSERVATION_TYPES))/);
const baseImports = importsMatch ? importsMatch[1] : '';

// We will split the file by extracting specific functions using simple substring logic.
// QuickObservationCard.tsx is very cleanly structured.

// 1. Types file
const typesContent = `import { z } from 'zod';
import { type SeverityLevelV2 } from '@/lib/hsse-severity-levels';

export const OBSERVATION_TYPES = [
  { value: 'unsafe_act', labelKey: 'incidents.observationTypes.unsafeAct', isPositive: false },
  { value: 'unsafe_condition', labelKey: 'incidents.observationTypes.unsafeCondition', isPositive: false },
  { value: 'safe_act', labelKey: 'incidents.observationTypes.safeAct', isPositive: true },
  { value: 'safe_condition', labelKey: 'incidents.observationTypes.safeCondition', isPositive: true },
];

export const RECOGNITION_TYPES = [
  { value: 'individual', labelKey: 'positiveObservation.individual' },
  { value: 'department', labelKey: 'positiveObservation.department' },
  { value: 'contractor', labelKey: 'positiveObservation.contractor' },
];

export const createQuickObservationSchema = (t: (key: string, options?: any) => string) => z.object({
  description: z.string().min(1, t('incidents.validation.descriptionRequired')).max(2000),
  subtype: z.string().min(1, t('incidents.validation.subtypeRequired')),
  severity_v2: z.enum(['level_1', 'level_2', 'level_3', 'level_4', 'level_5'] as const),
  observed_date: z.string().min(1, t('quickObservation.validation.dateRequired')),
  observed_time: z.string().min(1, t('quickObservation.validation.timeRequired')),
  site_id: z.string().min(1, t('incidents.validation.siteRequired', 'Site selection is required')),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  closed_on_spot: z.boolean().default(false),
  recognition_type: z.enum(['individual', 'department', 'contractor']).optional(),
  recognized_user_id: z.string().optional(),
  recognized_department_id: z.string().optional(),
  recognized_contractor_worker_id: z.string().optional(),
  is_against_contractor: z.boolean().default(false),
  related_contractor_company_id: z.string().optional(),
});

export type FormValues = z.infer<ReturnType<typeof createQuickObservationSchema>>;

export interface QuickObservationCardProps {
  onCancel: () => void;
}
`;
fs.writeFileSync(path.join(targetDir, 'types.ts'), typesContent);

// 2. index.tsx
const indexContent = `export { default } from './QuickObservationCard';\n`;
fs.writeFileSync(path.join(targetDir, 'index.tsx'), indexContent);

// We need to write the components now
// The best strategy is to write out the smaller components manually, and leave the shell.

const scriptToRun = `
// Will write the rest of the pieces manually for exactness.
console.log('Folders created');
`;
fs.writeFileSync(path.join(__dirname, 'split-obs-temp.js'), scriptToRun);
