import React from 'react';
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
