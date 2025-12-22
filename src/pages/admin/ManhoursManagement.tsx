import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Clock, Plus, Pencil, Trash2, Building2, MapPin, Users, Briefcase, Calendar, FileText, Upload, Download, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useManhours, useCreateManhour, useUpdateManhour, useDeleteManhour, useManhoursSummary } from '@/hooks/use-manhours';
import { useBranches } from '@/hooks/use-branches';
import { useSites } from '@/hooks/use-sites';
import { useDepartments } from '@/hooks/use-departments';
import ManhoursTrendChart from '@/components/manhours/ManhoursTrendChart';
import * as XLSX from 'xlsx';

interface ManhourFormData {
  period_date: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  employee_hours: number;
  contractor_hours: number;
  branch_id: string;
  site_id: string;
  department_id: string;
  notes: string;
}

interface ImportRow {
  period_date: string;
  period_type: string;
  employee_hours: number;
  contractor_hours: number;
  branch_name?: string;
  site_name?: string;
  notes?: string;
  isValid: boolean;
  errors: string[];
}

const defaultFormData: ManhourFormData = {
  period_date: format(new Date(), 'yyyy-MM-dd'),
  period_type: 'monthly',
  employee_hours: 0,
  contractor_hours: 0,
  branch_id: '',
  site_id: '',
  department_id: '',
  notes: '',
};

export default function ManhoursManagement() {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ManhourFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Date range for listing (last 12 months)
  const startDate = format(subMonths(startOfMonth(new Date()), 11), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  const { data: manhours, isLoading } = useManhours(startDate, endDate);
  const { data: summary } = useManhoursSummary(startDate, endDate);
  const { data: branches } = useBranches();
  const { data: sites } = useSites();
  const { data: departments } = useDepartments();

  const createMutation = useCreateManhour();
  const updateMutation = useUpdateManhour();
  const deleteMutation = useDeleteManhour();

  const handleOpenDialog = (record?: typeof manhours extends (infer T)[] ? T : never) => {
    if (record) {
      setEditingId(record.id);
      setFormData({
        period_date: record.period_date,
        period_type: record.period_type as 'daily' | 'weekly' | 'monthly',
        employee_hours: Number(record.employee_hours),
        contractor_hours: Number(record.contractor_hours),
        branch_id: record.branch_id || '',
        site_id: record.site_id || '',
        department_id: record.department_id || '',
        notes: record.notes || '',
      });
    } else {
      setEditingId(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      period_date: formData.period_date,
      period_type: formData.period_type,
      employee_hours: formData.employee_hours,
      contractor_hours: formData.contractor_hours,
      branch_id: formData.branch_id || null,
      site_id: formData.site_id || null,
      department_id: formData.department_id || null,
      notes: formData.notes || null,
    };

    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    setDeleteConfirmId(null);
  };

  const formatNumber = (num: number | string) => {
    return Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  // Excel Import Functions
  const downloadTemplate = () => {
    const template = [
      {
        period_date: format(new Date(), 'yyyy-MM-dd'),
        period_type: 'monthly',
        employee_hours: 0,
        contractor_hours: 0,
        branch_name: '',
        site_name: '',
        notes: '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Manhours Template');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // period_date
      { wch: 10 }, // period_type
      { wch: 15 }, // employee_hours
      { wch: 15 }, // contractor_hours
      { wch: 20 }, // branch_name
      { wch: 20 }, // site_name
      { wch: 30 }, // notes
    ];

    XLSX.writeFile(wb, 'manhours_template.xlsx');
    toast.success(t('admin.manhours.templateDownloaded', 'Template downloaded'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

        // Validate and transform data
        const validatedData: ImportRow[] = jsonData.map((row) => {
          const errors: string[] = [];
          
          // Validate period_date
          const periodDate = row.period_date as string;
          if (!periodDate || isNaN(Date.parse(periodDate))) {
            errors.push(t('admin.manhours.invalidDate', 'Invalid date'));
          }

          // Validate period_type
          const periodType = (row.period_type as string)?.toLowerCase();
          if (!['daily', 'weekly', 'monthly'].includes(periodType)) {
            errors.push(t('admin.manhours.invalidPeriodType', 'Invalid period type'));
          }

          // Validate hours
          const employeeHours = Number(row.employee_hours) || 0;
          const contractorHours = Number(row.contractor_hours) || 0;
          if (employeeHours < 0 || contractorHours < 0) {
            errors.push(t('admin.manhours.negativeHours', 'Hours cannot be negative'));
          }

          return {
            period_date: periodDate,
            period_type: periodType,
            employee_hours: employeeHours,
            contractor_hours: contractorHours,
            branch_name: row.branch_name as string || '',
            site_name: row.site_name as string || '',
            notes: row.notes as string || '',
            isValid: errors.length === 0,
            errors,
          };
        });

        setImportData(validatedData);
        setIsImportDialogOpen(true);
      } catch (error) {
        toast.error(t('admin.manhours.importParseError', 'Failed to parse Excel file'));
      }
    };
    reader.readAsBinaryString(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    const validRows = importData.filter((row) => row.isValid);
    if (validRows.length === 0) {
      toast.error(t('admin.manhours.noValidRows', 'No valid rows to import'));
      return;
    }

    setIsImporting(true);
    let successCount = 0;

    try {
      for (const row of validRows) {
        // Find branch/site by name
        const branch = branches?.find((b) => b.name.toLowerCase() === row.branch_name?.toLowerCase());
        const site = sites?.find((s) => s.name.toLowerCase() === row.site_name?.toLowerCase());

        await createMutation.mutateAsync({
          period_date: row.period_date,
          period_type: row.period_type as 'daily' | 'weekly' | 'monthly',
          employee_hours: row.employee_hours,
          contractor_hours: row.contractor_hours,
          branch_id: branch?.id || null,
          site_id: site?.id || null,
          department_id: null,
          notes: row.notes || null,
        });
        successCount++;
      }

      toast.success(t('admin.manhours.importSuccess', 'Successfully imported {{count}} records', { count: successCount }));
      setIsImportDialogOpen(false);
      setImportData([]);
    } catch (error) {
      toast.error(t('admin.manhours.importError', 'Import failed'));
    } finally {
      setIsImporting(false);
    }
  };

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('admin.manhours.employeeHours', 'Employee Hours')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatNumber(summary?.total_employee_hours || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              {t('admin.manhours.contractorHours', 'Contractor Hours')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {formatNumber(summary?.total_contractor_hours || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('admin.manhours.totalHours', 'Total Hours')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(summary?.total_hours || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('admin.manhours.records', 'Records')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {summary?.record_count || 0}
            </div>
          </CardContent>
        </Card>
      </div>

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

        <TabsContent value="records">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.manhours.recordsList', 'Manhours Records')}</CardTitle>
              <CardDescription>
                {t('admin.manhours.recordsDescription', 'Last 12 months of recorded manhours')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.manhours.date', 'Date')}</TableHead>
                      <TableHead>{t('admin.manhours.type', 'Type')}</TableHead>
                      <TableHead>{t('admin.manhours.location', 'Location')}</TableHead>
                      <TableHead className="text-end">{t('admin.manhours.employee', 'Employee')}</TableHead>
                      <TableHead className="text-end">{t('admin.manhours.contractor', 'Contractor')}</TableHead>
                      <TableHead className="text-end">{t('admin.manhours.total', 'Total')}</TableHead>
                      <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manhours?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t('admin.manhours.noRecords', 'No manhours records found. Add your first record to start tracking.')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      manhours?.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(record.period_date), 'MMM yyyy')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {t(`admin.manhours.${record.period_type}`, record.period_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-sm">
                              {record.branches?.name && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {record.branches.name}
                                </span>
                              )}
                              {record.sites?.name && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {record.sites.name}
                                </span>
                              )}
                              {!record.branches?.name && !record.sites?.name && (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-end font-medium text-primary">
                            {formatNumber(record.employee_hours)}
                          </TableCell>
                          <TableCell className="text-end font-medium text-orange-500">
                            {formatNumber(record.contractor_hours)}
                          </TableCell>
                          <TableCell className="text-end font-bold">
                            {formatNumber(Number(record.employee_hours) + Number(record.contractor_hours))}
                          </TableCell>
                          <TableCell className="text-end">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(record)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteConfirmId(record.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend">
          <ManhoursTrendChart />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingId 
                ? t('admin.manhours.editRecord', 'Edit Manhours Record')
                : t('admin.manhours.addRecord', 'Add Manhours Record')
              }
            </DialogTitle>
            <DialogDescription>
              {t('admin.manhours.formDescription', 'Enter the working hours for the selected period')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period_date">{t('admin.manhours.periodDate', 'Period Date')}</Label>
                <Input
                  id="period_date"
                  type="date"
                  value={formData.period_date}
                  onChange={(e) => setFormData({ ...formData, period_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="period_type">{t('admin.manhours.periodType', 'Period Type')}</Label>
                <Select
                  value={formData.period_type}
                  onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                    setFormData({ ...formData, period_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('admin.manhours.daily', 'Daily')}</SelectItem>
                    <SelectItem value="weekly">{t('admin.manhours.weekly', 'Weekly')}</SelectItem>
                    <SelectItem value="monthly">{t('admin.manhours.monthly', 'Monthly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee_hours">{t('admin.manhours.employeeHours', 'Employee Hours')}</Label>
                <Input
                  id="employee_hours"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.employee_hours}
                  onChange={(e) => setFormData({ ...formData, employee_hours: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractor_hours">{t('admin.manhours.contractorHours', 'Contractor Hours')}</Label>
                <Input
                  id="contractor_hours"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.contractor_hours}
                  onChange={(e) => setFormData({ ...formData, contractor_hours: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch_id">{t('admin.manhours.branch', 'Branch')}</Label>
              <Select
                value={formData.branch_id || '__none__'}
                onValueChange={(value) => setFormData({ ...formData, branch_id: value === '__none__' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.manhours.selectBranch', 'Select branch (optional)')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('admin.manhours.allBranches', 'All Branches')}</SelectItem>
                  {branches?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="site_id">{t('admin.manhours.site', 'Site')}</Label>
              <Select
                value={formData.site_id || '__none__'}
                onValueChange={(value) => setFormData({ ...formData, site_id: value === '__none__' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.manhours.selectSite', 'Select site (optional)')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('admin.manhours.allSites', 'All Sites')}</SelectItem>
                  {sites?.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('admin.manhours.notes', 'Notes')}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('admin.manhours.notesPlaceholder', 'Optional notes about this record...')}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                )}
                {editingId ? t('common.save', 'Save') : t('common.create', 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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

      {/* Import Preview Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{t('admin.manhours.importPreview', 'Import Preview')}</DialogTitle>
            <DialogDescription>
              {t('admin.manhours.importPreviewDescription', 'Review the data before importing')}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.manhours.date', 'Date')}</TableHead>
                  <TableHead>{t('admin.manhours.type', 'Type')}</TableHead>
                  <TableHead className="text-end">{t('admin.manhours.employee', 'Employee')}</TableHead>
                  <TableHead className="text-end">{t('admin.manhours.contractor', 'Contractor')}</TableHead>
                  <TableHead>{t('common.status', 'Status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importData.map((row, index) => (
                  <TableRow key={index} className={!row.isValid ? 'bg-destructive/10' : ''}>
                    <TableCell>{row.period_date}</TableCell>
                    <TableCell>{row.period_type}</TableCell>
                    <TableCell className="text-end">{formatNumber(row.employee_hours)}</TableCell>
                    <TableCell className="text-end">{formatNumber(row.contractor_hours)}</TableCell>
                    <TableCell>
                      {row.isValid ? (
                        <Badge variant="default">{t('common.valid', 'Valid')}</Badge>
                      ) : (
                        <Badge variant="destructive">{row.errors.join(', ')}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {importData.some((row) => !row.isValid) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('admin.manhours.validationErrors', 'Validation Errors')}</AlertTitle>
              <AlertDescription>
                {t('admin.manhours.invalidRowsSkipped', 'Invalid rows will be skipped during import.')}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              onClick={handleImport}
              disabled={isImporting || importData.filter((r) => r.isValid).length === 0}
            >
              {isImporting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('admin.manhours.importCount', 'Import {{count}} records', { 
                count: importData.filter((r) => r.isValid).length 
              })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
