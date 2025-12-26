import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  TrendingDown, 
  TrendingUp, 
  Edit2, 
  Check, 
  X, 
  Trash2,
  Info 
} from 'lucide-react';
import { KPITargetAdmin, KPI_METADATA, useUpdateKPITarget, useDeleteKPITarget } from '@/hooks/use-kpi-targets-admin';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface KPITargetCardProps {
  target: KPITargetAdmin;
}

export function KPITargetCard({ target }: KPITargetCardProps) {
  const { t, i18n } = useTranslation();
  const updateMutation = useUpdateKPITarget();
  const deleteMutation = useDeleteKPITarget();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editValues, setEditValues] = useState({
    target_value: target.target_value,
    warning_threshold: target.warning_threshold ?? 0,
    critical_threshold: target.critical_threshold ?? 0,
  });

  const isRTL = i18n.dir() === 'rtl';
  const meta = KPI_METADATA[target.kpi_code];
  const isLowerBetter = meta?.comparison_type === 'less_than';
  const kpiName = meta?.name || target.kpi_code;
  const kpiNameAr = meta?.nameAr || kpiName;
  const description = meta?.description || '';

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      id: target.id,
      ...editValues,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValues({
      target_value: target.target_value,
      warning_threshold: target.warning_threshold ?? 0,
      critical_threshold: target.critical_threshold ?? 0,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(target.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="relative group hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isLowerBetter ? 'bg-blue-500' : 'bg-green-500'}`} />
              <h3 className="font-semibold text-foreground">
                {isRTL ? kpiNameAr : kpiName}
              </h3>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {description}
                </TooltipContent>
              </Tooltip>
            </div>
            <Badge variant="outline" className="text-xs">
              {isLowerBetter ? (
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {t('kpiAdmin.lowerIsBetter', 'Lower')}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {t('kpiAdmin.higherIsBetter', 'Higher')}
                </span>
              )}
            </Badge>
          </div>

          {/* Values */}
          <div className="space-y-3">
            {isEditing ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t('kpiAdmin.target', 'Target')}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editValues.target_value}
                      onChange={(e) => setEditValues(prev => ({ ...prev, target_value: parseFloat(e.target.value) || 0 }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t('kpiAdmin.warning', 'Warning')}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editValues.warning_threshold}
                      onChange={(e) => setEditValues(prev => ({ ...prev, warning_threshold: parseFloat(e.target.value) || 0 }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {t('kpiAdmin.critical', 'Critical')}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editValues.critical_threshold}
                      onChange={(e) => setEditValues(prev => ({ ...prev, critical_threshold: parseFloat(e.target.value) || 0 }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button size="sm" variant="ghost" onClick={handleCancel} disabled={updateMutation.isPending}>
                    <X className="h-4 w-4 me-1" />
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                    <Check className="h-4 w-4 me-1" />
                    {t('common.save', 'Save')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t('kpiAdmin.target', 'Target')}</div>
                    <div className="text-lg font-semibold font-mono text-foreground">{target.target_value}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t('kpiAdmin.warning', 'Warning')}</div>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                      <span className="text-lg font-semibold font-mono text-foreground">
                        {target.warning_threshold ?? '-'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t('kpiAdmin.critical', 'Critical')}</div>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-lg font-semibold font-mono text-foreground">
                        {target.critical_threshold ?? '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('kpiAdmin.deleteTitle', 'Delete KPI Target')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('kpiAdmin.deleteDescription', 'Are you sure you want to delete the {{kpi}} target? This action cannot be undone.', { kpi: kpiName })}
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
    </>
  );
}
