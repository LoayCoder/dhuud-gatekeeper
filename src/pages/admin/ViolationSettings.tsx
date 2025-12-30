import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Plus, Pencil, Trash2 } from 'lucide-react';
import { SLAPageLayout } from '@/components/sla/SLAPageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useViolationTypes, useCreateViolationType, useUpdateViolationType, useDeleteViolationType, ACTION_TYPES, ActionType, ViolationType, CreateViolationTypeInput } from '@/hooks/use-violation-types';
import { HSSE_SEVERITY_LEVELS, SeverityLevelV2 } from '@/lib/hsse-severity-levels';

export default function ViolationSettings() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  
  const { data: violations, isLoading } = useViolationTypes();
  const createViolation = useCreateViolationType();
  const updateViolation = useUpdateViolationType();
  const deleteViolation = useDeleteViolationType();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingViolation, setEditingViolation] = useState<ViolationType | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateViolationTypeInput>({
    name: '',
    name_ar: '',
    severity_level: 'level_1',
    first_action_type: 'warning',
    first_fine_amount: undefined,
    first_action_description: '',
    second_action_type: 'fine',
    second_fine_amount: undefined,
    second_action_description: '',
    third_action_type: 'site_removal',
    third_fine_amount: undefined,
    third_action_description: '',
  });
  
  const resetForm = () => {
    setFormData({
      name: '',
      name_ar: '',
      severity_level: 'level_1',
      first_action_type: 'warning',
      first_fine_amount: undefined,
      first_action_description: '',
      second_action_type: 'fine',
      second_fine_amount: undefined,
      second_action_description: '',
      third_action_type: 'site_removal',
      third_fine_amount: undefined,
      third_action_description: '',
    });
    setEditingViolation(null);
  };
  
  const handleOpenDialog = (violation?: ViolationType) => {
    if (violation) {
      setEditingViolation(violation);
      setFormData({
        name: violation.name,
        name_ar: violation.name_ar || '',
        severity_level: violation.severity_level,
        first_action_type: violation.first_action_type,
        first_fine_amount: violation.first_fine_amount || undefined,
        first_action_description: violation.first_action_description || '',
        second_action_type: violation.second_action_type,
        second_fine_amount: violation.second_fine_amount || undefined,
        second_action_description: violation.second_action_description || '',
        third_action_type: violation.third_action_type,
        third_fine_amount: violation.third_fine_amount || undefined,
        third_action_description: violation.third_action_description || '',
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };
  
  const handleSave = async () => {
    if (!formData.name.trim()) return;
    
    if (editingViolation) {
      await updateViolation.mutateAsync({
        id: editingViolation.id,
        ...formData,
      });
    } else {
      await createViolation.mutateAsync(formData);
    }
    handleCloseDialog();
  };
  
  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteViolation.mutateAsync(deletingId);
    setDeleteDialogOpen(false);
    setDeletingId(null);
  };
  
  const getSeverityConfig = (level: SeverityLevelV2) => {
    return HSSE_SEVERITY_LEVELS.find(s => s.value === level);
  };
  
  const getSeverityLabel = (config: typeof HSSE_SEVERITY_LEVELS[0]) => {
    return t(config.labelKey);
  };
  
  const getActionLabel = (type: ActionType, amount?: number | null) => {
    const label = t(ACTION_TYPES.find(a => a.value === type)?.labelKey || type);
    if (type === 'fine' && amount) {
      return `${label}: ${amount} ${t('common.sar', 'SAR')}`;
    }
    return label;
  };
  
  const renderOccurrenceFields = (
    prefix: 'first' | 'second' | 'third',
    label: string
  ) => {
    const actionKey = `${prefix}_action_type` as keyof CreateViolationTypeInput;
    const fineKey = `${prefix}_fine_amount` as keyof CreateViolationTypeInput;
    const descKey = `${prefix}_action_description` as keyof CreateViolationTypeInput;
    const actionValue = formData[actionKey] as ActionType;
    
    return (
      <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
        <h4 className="font-medium text-sm">{label}</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>{t('violations.actionType', 'Action Type')}</Label>
            <Select
              value={actionValue}
              onValueChange={(value) => setFormData({ ...formData, [actionKey]: value as ActionType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((action) => (
                  <SelectItem key={action.value} value={action.value}>
                    {t(action.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {actionValue === 'fine' && (
            <div className="space-y-2">
              <Label>{t('violations.fineAmount', 'Fine Amount (SAR)')}</Label>
              <Input
                type="number"
                min={0}
                value={formData[fineKey] || ''}
                onChange={(e) => setFormData({ ...formData, [fineKey]: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="0"
              />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>{t('violations.actionDescription', 'Description')}</Label>
          <Textarea
            value={(formData[descKey] as string) || ''}
            onChange={(e) => setFormData({ ...formData, [descKey]: e.target.value })}
            rows={2}
            placeholder={t('violations.descriptionPlaceholder', 'Optional description...')}
          />
        </div>
      </div>
    );
  };

  return (
    <SLAPageLayout
      title={t('violations.title', 'Violation Settings')}
      description={t('violations.description', 'Configure safety violations and progressive discipline actions')}
      icon={<AlertTriangle className="h-6 w-6" />}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">{t('violations.list', 'Violation Types')}</CardTitle>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('violations.addViolation', 'Add Violation')}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : violations && violations.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('violations.name', 'Violation Name')}</TableHead>
                    <TableHead>{t('violations.severity', 'Severity')}</TableHead>
                    <TableHead>{t('violations.firstOccurrence', '1st Occurrence')}</TableHead>
                    <TableHead>{t('violations.secondOccurrence', '2nd Occurrence')}</TableHead>
                    <TableHead>{t('violations.thirdOccurrence', '3rd Occurrence')}</TableHead>
                    <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violations.map((violation) => {
                    const severityConfig = getSeverityConfig(violation.severity_level);
                    return (
                      <TableRow key={violation.id}>
                        <TableCell className="font-medium">
                          {isRtl ? (violation.name_ar || violation.name) : violation.name}
                        </TableCell>
                        <TableCell>
                          {severityConfig && (
                            <Badge
                              variant="outline"
                              style={{
                                borderColor: severityConfig.color,
                                color: severityConfig.color,
                                backgroundColor: `${severityConfig.color}15`,
                              }}
                            >
                              {t(severityConfig.labelKey)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getActionLabel(violation.first_action_type, violation.first_fine_amount)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getActionLabel(violation.second_action_type, violation.second_fine_amount)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {getActionLabel(violation.third_action_type, violation.third_fine_amount)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(violation)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeletingId(violation.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('violations.noViolations', 'No violations configured yet')}</p>
              <Button variant="outline" className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 me-2" />
                {t('violations.addViolation', 'Add Violation')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingViolation
                ? t('violations.editViolation', 'Edit Violation')
                : t('violations.addViolation', 'Add Violation')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('violations.name', 'Violation Name')} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('violations.namePlaceholder', 'Enter violation name')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('violations.nameAr', 'Violation Name (Arabic)')}</Label>
                <Input
                  dir="rtl"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="أدخل اسم المخالفة"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{t('violations.severity', 'Severity Level')} *</Label>
              <Select
                value={formData.severity_level}
                onValueChange={(value) => setFormData({ ...formData, severity_level: value as SeverityLevelV2 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HSSE_SEVERITY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: level.color }}
                        />
                        {t(level.labelKey)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Progressive Discipline */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {t('violations.progressiveDiscipline', 'Progressive Discipline')}
              </h3>
              {renderOccurrenceFields('first', t('violations.firstOccurrence', '1st Occurrence'))}
              {renderOccurrenceFields('second', t('violations.secondOccurrence', '2nd Occurrence'))}
              {renderOccurrenceFields('third', t('violations.thirdOccurrence', '3rd Occurrence'))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name.trim() || createViolation.isPending || updateViolation.isPending}
            >
              {editingViolation ? t('common.save', 'Save') : t('common.create', 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('violations.deleteTitle', 'Delete Violation')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('violations.deleteConfirm', 'Are you sure you want to delete this violation? This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SLAPageLayout>
  );
}
