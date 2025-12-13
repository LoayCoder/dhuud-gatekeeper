import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Clock, Plus, Pencil, Trash2, Building2, MapPin, Users, Briefcase, Calendar, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useManhours, useCreateManhour, useUpdateManhour, useDeleteManhour, useManhoursSummary } from '@/hooks/use-manhours';
import { useBranches } from '@/hooks/use-branches';
import { useSites } from '@/hooks/use-sites';
import { useDepartments } from '@/hooks/use-departments';
import { Loader2 } from 'lucide-react';

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            {t('admin.manhours.title', 'Manhours Management')}
          </h1>
          <p className="text-muted-foreground">
            {t('admin.manhours.description', 'Record and track employee and contractor working hours for KPI calculations')}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 me-2" />
          {t('admin.manhours.addRecord', 'Add Record')}
        </Button>
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

      {/* Records Table */}
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
                          {record.period_type}
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
                value={formData.branch_id}
                onValueChange={(value) => setFormData({ ...formData, branch_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.manhours.selectBranch', 'Select branch (optional)')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('admin.manhours.allBranches', 'All Branches')}</SelectItem>
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
                value={formData.site_id}
                onValueChange={(value) => setFormData({ ...formData, site_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.manhours.selectSite', 'Select site (optional)')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('admin.manhours.allSites', 'All Sites')}</SelectItem>
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
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.manhours.deleteConfirm', 'Delete Record')}</DialogTitle>
            <DialogDescription>
              {t('admin.manhours.deleteConfirmMessage', 'Are you sure you want to delete this manhours record? This action cannot be undone.')}
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
    </div>
  );
}
