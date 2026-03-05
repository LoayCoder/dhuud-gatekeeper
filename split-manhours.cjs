const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'src/pages/admin/ManhoursManagement.tsx');
let content = fs.readFileSync(sourceFile, 'utf8');

const targetDir = path.join(__dirname, 'src/pages/admin/ManhoursManagement');
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

// 1. Types & Data
const typesStr = extractBetween(content, 'interface ManhourFormData {', 'export default function ManhoursManagement() {');
const typesContent = `import { format } from 'date-fns';\n\ninterface ManhourFormData {${typesStr}`;
fs.writeFileSync(path.join(targetDir, 'types.ts'), typesContent);

// 2. State Hook
const stateTop = `import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { toast } from 'sonner';
import { useManhours, useCreateManhour, useUpdateManhour, useDeleteManhour, useManhoursSummary } from '@/hooks/use-manhours';
import { useBranches } from '@/hooks/use-branches';
import { useSites } from '@/hooks/use-sites';
import { useDepartmentsByBranch } from '@/hooks/use-departments-by-site';
import * as XLSX from 'xlsx';
import { ManhourFormData, ImportRow, defaultFormData, getDefaultWorkingDays } from '../types';

export function useManhoursManagementState() {
  const { t } = useTranslation();
`;

const stateBody = extractBetween(content, '  const [isDialogOpen, setIsDialogOpen] = useState(false);', '  return (');
const stateBottom = `
  return {
    t, isDialogOpen, setIsDialogOpen, editingId, setEditingId, formData, setFormData,
    deleteConfirmId, setDeleteConfirmId, isImportDialogOpen, setIsImportDialogOpen,
    importData, setImportData, isImporting, setIsImporting, fileInputRef,
    manhours, isLoading, summary, branches, sites, departments,
    createMutation, updateMutation, deleteMutation,
    handleOpenDialog, calculateHours, handlePeriodTypeChange, handleCalculationModeChange,
    handleManpowerChange, handleSubmit, handleDelete, formatNumber, downloadTemplate,
    handleFileUpload, handleImport
  };
}
`;

fs.writeFileSync(path.join(hooksDir, 'useManhoursManagementState.ts'), stateTop + "  const [isDialogOpen, setIsDialogOpen] = useState(false);\n" + stateBody + stateBottom);

// 3. Components

// SummaryCards
const summaryCardsStr = extractBetween(content, '{/* Summary Cards */}', '{/* Tabs: Records & Trend */}');
fs.writeFileSync(path.join(componentsDir, 'SummaryCards.tsx'),
    `import { useTranslation } from 'react-i18next';
import { Users, Briefcase, Clock, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SummaryCards({ state }: { state: any }) {
  const { t, summary, formatNumber } = state;
  return (\n    ${summaryCardsStr.trim()}\n  );\n}\n`);

// RecordsTab
const recordsTabStr = extractBetween(content, '<TabsContent value="records">', '</TabsContent>\n\n        <TabsContent value="trend">');
fs.writeFileSync(path.join(componentsDir, 'RecordsTab.tsx'),
    `import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Pencil, Trash2, Building2, MapPin, Calendar, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function RecordsTab({ state }: { state: any }) {
  const { t, manhours, isLoading, formatNumber, handleOpenDialog, setDeleteConfirmId } = state;
  return (\n    <TabsContent value="records">\n      ${recordsTabStr.trim()}\n    </TabsContent>\n  );\n}\n`
        .replace('<TabsContent value="records">', '')
        .replace('</TabsContent>', ''));

// ManhoursDialog
const dialogStr = extractBetween(content, '{/* Add/Edit Dialog */}', '{/* Delete Confirmation Dialog */}');
fs.writeFileSync(path.join(componentsDir, 'ManhoursDialog.tsx'),
    `import { useTranslation } from 'react-i18next';
import { Clock, Users, Briefcase, Calendar, Calculator, Info, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { workSchedulePresets } from '../types';

export function ManhoursDialog({ state }: { state: any }) {
  const { t, isDialogOpen, setIsDialogOpen, editingId, formData, setFormData, handleSubmit, handlePeriodTypeChange, handleCalculationModeChange, handleManpowerChange, branches, sites, departments, formatNumber, createMutation, updateMutation } = state;
  return (\n    ${dialogStr.trim()}\n  );\n}\n`);

// ImportDialog
const importDialogStr = extractBetween(content, '{/* Import Preview Dialog */}', '</div>\n  );\n}');
fs.writeFileSync(path.join(componentsDir, 'ImportDialog.tsx'),
    `import { useTranslation } from 'react-i18next';
import { Loader2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function ImportDialog({ state }: { state: any }) {
  const { t, isImportDialogOpen, setIsImportDialogOpen, importData, isImporting, handleImport, formatNumber } = state;
  return (\n    ${importDialogStr.trim()}\n  );\n}\n`);

// 4. Main Component
const shellContent = `import React from 'react';
import { Clock, Download, Upload, Plus, FileText, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ManhoursTrendChart from '@/components/manhours/ManhoursTrendChart';
import { useManhoursManagementState } from './hooks/useManhoursManagementState';
import { SummaryCards } from './components/SummaryCards';
import { RecordsTab } from './components/RecordsTab';
import { ManhoursDialog } from './components/ManhoursDialog';
import { ImportDialog } from './components/ImportDialog';
import { TabsContent as BaseTabsContent } from '@/components/ui/tabs'; // Aliased

export default function ManhoursManagement() {
  const state = useManhoursManagementState();
  const {
    t, fileInputRef, downloadTemplate, handleFileUpload, handleOpenDialog,
    deleteConfirmId, setDeleteConfirmId, handleDelete, deleteMutation
  } = state;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            {t('admin.manhours.title', 'Manhours Management')}
          </h1>
          <p className="text-muted-foreground">
            {t('admin.manhours.description', 'Record and track employee and contractor working hours for KPI calculations')}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 me-2" />
            {t('admin.manhours.downloadTemplate', 'Download Template')}
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 me-2" />
            {t('admin.manhours.importExcel', 'Import from Excel')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 me-2" />
            {t('admin.manhours.addRecord', 'Add Record')}
          </Button>
        </div>
      </div>

      <SummaryCards state={state} />

      {/* Tabs: Records & Trend */}
      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t('admin.manhours.recordsList', 'Records')}
          </TabsTrigger>
          <TabsTrigger value="trend" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('admin.manhours.trend', 'Trend')}
          </TabsTrigger>
        </TabsList>

        <BaseTabsContent value="records">
          <RecordsTab state={state} />
        </BaseTabsContent>

        <BaseTabsContent value="trend">
          <ManhoursTrendChart />
        </BaseTabsContent>
      </Tabs>

      <ManhoursDialog state={state} />
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.confirmDelete', 'Confirm Delete')}</DialogTitle>
            <DialogDescription>
              {t('admin.manhours.deleteConfirm', 'Are you sure you want to delete this record?')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('common.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportDialog state={state} />
    </div>
  );
}
`;

fs.writeFileSync(path.join(targetDir, 'ManhoursManagement.tsx'), shellContent);
fs.writeFileSync(path.join(targetDir, 'index.tsx'), "export { default } from './ManhoursManagement';\n");

console.log('Extraction complete!');
