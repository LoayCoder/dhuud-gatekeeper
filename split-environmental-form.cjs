const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'src/components/investigation/environmental-impact/EnvironmentalContaminationForm.tsx');
let content = fs.readFileSync(sourceFile, 'utf8');

const targetDir = path.join(__dirname, 'src/components/investigation/environmental-impact/EnvironmentalContaminationForm');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

const hooksDir = path.join(targetDir, 'hooks');
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

const componentsDir = path.join(targetDir, 'components');
if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir, { recursive: true });

function extractBetween(str, startStr, endStr) {
    const startIdx = str.indexOf(startStr);
    if (startIdx === -1) return '';
    const restStr = str.substring(startIdx + startStr.length);
    const endIdx = restStr.indexOf(endStr);
    if (endIdx === -1) return '';
    return restStr.substring(0, endIdx);
}

// 1. Types & Schema
const schemaImports = `import * as z from 'zod';\nimport { EnvironmentalContaminationEntry } from '@/lib/environmental-contamination-constants';\n\n`;
const schemaStr = extractBetween(content, 'const formSchema = z.object({', '});');
const typesContent = schemaImports + `export const formSchema = z.object({${schemaStr}});\n\nexport type FormData = z.infer<typeof formSchema>;\n\nexport interface EnvironmentalContaminationFormProps {\n  open: boolean;\n  onOpenChange: (open: boolean) => void;\n  entry?: EnvironmentalContaminationEntry | null;\n  onSubmit: (data: FormData) => Promise<void>;\n  isLoading?: boolean;\n}\n`;
fs.writeFileSync(path.join(targetDir, 'types.ts'), typesContent);

// 2. Main Hook
const stateTop = `import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormData, formSchema, EnvironmentalContaminationFormProps } from '../types';

export function useEnvironmentalContaminationForm(props: Omit<EnvironmentalContaminationFormProps, 'isLoading'>) {
  const { open, onOpenChange, entry, onSubmit } = props;
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
`;

const stateBody = extractBetween(content, "  const [expandedSections, setExpandedSections] = useState<string[]>(['section-a']);", "  return (");
const stateBottom = `
  return {
    t, isRTL, expandedSections, setExpandedSections, form,
    watchVolume, watchArea, watchDepth, watchContainmentExists,
    watchContainmentCapacity, watchContainmentRetained, watchPopulationExposed,
    watchReleaseCause, watchContainmentFailureReason, watchRegulatoryNotification,
    calculatedVolume, calculatedFailurePercentage, regulatoryBreachDetected, totalCost,
    handleSubmit, toggleArrayField,
    open, onOpenChange, entry, onSubmit
  };
}
`;
fs.writeFileSync(path.join(hooksDir, 'useEnvironmentalContaminationForm.ts'), stateTop + "  const [expandedSections, setExpandedSections] = useState<string[]>(['section-a']);\n" + stateBody + stateBottom);

// 3. Section Components
const commonImports = `import { useTranslation } from 'react-i18next';
import { Calculator, AlertTriangle, Info } from 'lucide-react';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  CONTAMINATION_TYPES, RELEASE_SOURCES, RELEASE_CAUSES, HAZARD_CLASSIFICATIONS,
  CONTAINMENT_FAILURE_REASONS, IMPACTED_RECEPTORS, RECOVERY_POTENTIAL, EXPOSURE_TYPES,
  POPULATION_PROXIMITY, APPLICABLE_REGULATIONS, AUTHORITIES, VOLUME_UNITS, WEIGHT_UNITS
} from '@/lib/environmental-contamination-constants';\n\n`;

const makeSection = (id, titlePattern, nextTitlePattern, name) => {
    const extracted = extractBetween(content, titlePattern, nextTitlePattern);
    fs.writeFileSync(path.join(componentsDir, `${name}.tsx`),
        `${commonImports}export function ${name}({ state }: { state: any }) {
  const { t, isRTL, form, toggleArrayField, watchReleaseCause, watchContainmentExists, watchContainmentFailureReason, calculatedVolume, calculatedFailurePercentage, regulatoryBreachDetected, watchPopulationExposed, watchRegulatoryNotification, totalCost } = state;
  return (
    <AccordionItem value="${id}" className="border rounded-lg">
      <AccordionTrigger className="px-4 hover:no-underline">
        <span className="font-medium">
          ${titlePattern.replace('{/* ', '{').replace(' */}', '}')}
        </span>
      </AccordionTrigger>
      ${extracted.trim()}
  );
}\n`);
};

makeSection('section-a', "{/* Section A: Contamination Type & Source */}", "{/* Section B: Quantity & Spread */}", 'SectionA');
makeSection('section-b', "{/* Section B: Quantity & Spread */}", "{/* Section C: Secondary Containment */}", 'SectionB');
makeSection('section-c', "{/* Section C: Secondary Containment */}", "{/* Section D: Environmental & Population Impact */}", 'SectionC');
makeSection('section-d', "{/* Section D: Environmental & Population Impact */}", "{/* Section E: Cost Estimation */}", 'SectionD');
makeSection('section-e', "{/* Section E: Cost Estimation */}", "{/* Section F: Regulatory & Compliance */}", 'SectionE');

// Section F doesn't end with a section comment, but with closing Accordion
const sectionFExtracted = extractBetween(content, "{/* Section F: Regulatory & Compliance */}", "</Accordion>");
fs.writeFileSync(path.join(componentsDir, 'SectionF.tsx'),
    `${commonImports}export function SectionF({ state }: { state: any }) {
  const { t, isRTL, form, toggleArrayField, watchRegulatoryNotification } = state;
  return (
    <AccordionItem value="section-f" className="border rounded-lg">
      <AccordionTrigger className="px-4 hover:no-underline">
        <span className="font-medium">
          {t('investigation.environmentalImpact.sections.regulatory', 'F. Regulatory & Compliance')}
        </span>
      </AccordionTrigger>
      ${sectionFExtracted.trim()}
  );
}\n`);

// 4. Shell Component
const shellContent = `import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnvironmentalContaminationFormProps } from './types';
import { useEnvironmentalContaminationForm } from './hooks/useEnvironmentalContaminationForm';
import { SectionA } from './components/SectionA';
import { SectionB } from './components/SectionB';
import { SectionC } from './components/SectionC';
import { SectionD } from './components/SectionD';
import { SectionE } from './components/SectionE';
import { SectionF } from './components/SectionF';

export default function EnvironmentalContaminationForm({
  open,
  onOpenChange,
  entry,
  onSubmit,
  isLoading,
}: EnvironmentalContaminationFormProps) {
  const state = useEnvironmentalContaminationForm({ open, onOpenChange, entry, onSubmit });
  const { t, form, expandedSections, setExpandedSections, handleSubmit } = state;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>
            {entry 
              ? t('investigation.environmentalImpact.editEntry', 'Edit Contamination Entry')
              : t('investigation.environmentalImpact.addEntry', 'Add Contamination Entry')
            }
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)] px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pb-6">
              <Accordion 
                type="multiple" 
                value={expandedSections} 
                onValueChange={setExpandedSections}
                className="space-y-2"
              >
                <SectionA state={state} />
                <SectionB state={state} />
                <SectionC state={state} />
                <SectionD state={state} />
                <SectionE state={state} />
                <SectionF state={state} />
              </Accordion>

              {/* Form Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  {entry ? t('common.update', 'Update') : t('common.add', 'Add')}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
`;

fs.writeFileSync(path.join(targetDir, 'EnvironmentalContaminationForm.tsx'), shellContent);
fs.writeFileSync(path.join(targetDir, 'index.tsx'), "export { default } from './EnvironmentalContaminationForm';\n");

console.log('Extraction complete!');
