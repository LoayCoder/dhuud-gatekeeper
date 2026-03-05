import { useState, useRef } from 'react';
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
  
  // Filter departments by selected branch for proper hierarchy compliance
  const { data: departments } = useDepartmentsByBranch(formData.branch_id || undefined);

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
        employee_count: Number(record.employee_count) || 0,
        contractor_count: Number(record.contractor_count) || 0,
        hours_per_day: Number(record.hours_per_day) || 8,
        working_days: Number(record.working_days) || getDefaultWorkingDays(record.period_type as 'daily' | 'weekly' | 'monthly'),
        calculation_mode: (record.calculation_mode as 'manual' | 'auto') || 'manual',
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

  // Auto-calculate hours when in auto mode
  const calculateHours = (count: number, hoursPerDay: number, workingDays: number) => {
    return count * hoursPerDay * workingDays;
  };

  // Handle period type change - update working days automatically
  const handlePeriodTypeChange = (value: 'daily' | 'weekly' | 'monthly') => {
    const newWorkingDays = getDefaultWorkingDays(value);
    const newFormData = { ...formData, period_type: value, working_days: newWorkingDays };
    
    if (formData.calculation_mode === 'auto') {
      newFormData.employee_hours = calculateHours(formData.employee_count, formData.hours_per_day, newWorkingDays);
      newFormData.contractor_hours = calculateHours(formData.contractor_count, formData.hours_per_day, newWorkingDays);
    }
    
    setFormData(newFormData);
  };

  // Handle calculation mode toggle
  const handleCalculationModeChange = (isAuto: boolean) => {
    const mode = isAuto ? 'auto' : 'manual';
    const newFormData = { ...formData, calculation_mode: mode as 'manual' | 'auto' };
    
    if (isAuto) {
      newFormData.employee_hours = calculateHours(formData.employee_count, formData.hours_per_day, formData.working_days);
      newFormData.contractor_hours = calculateHours(formData.contractor_count, formData.hours_per_day, formData.working_days);
    }
    
    setFormData(newFormData);
  };

  // Handle manpower count changes
  const handleManpowerChange = (field: 'employee_count' | 'contractor_count' | 'hours_per_day' | 'working_days', value: number) => {
    const newFormData = { ...formData, [field]: value };
    
    if (formData.calculation_mode === 'auto') {
      const employeeCount = field === 'employee_count' ? value : formData.employee_count;
      const contractorCount = field === 'contractor_count' ? value : formData.contractor_count;
      const hoursPerDay = field === 'hours_per_day' ? value : formData.hours_per_day;
      const workingDays = field === 'working_days' ? value : formData.working_days;
      
      newFormData.employee_hours = calculateHours(employeeCount, hoursPerDay, workingDays);
      newFormData.contractor_hours = calculateHours(contractorCount, hoursPerDay, workingDays);
    }
    
    setFormData(newFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      period_date: formData.period_date,
      period_type: formData.period_type,
      employee_hours: formData.employee_hours,
      contractor_hours: formData.contractor_hours,
      employee_count: formData.employee_count,
      contractor_count: formData.contractor_count,
      hours_per_day: formData.hours_per_day,
      working_days: formData.working_days,
      calculation_mode: formData.calculation_mode,
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
