import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertTriangle, ArrowUp, Siren, Save, Info } from 'lucide-react';
import type { ActionSLAConfig } from '@/hooks/use-action-sla-config';

const slaConfigSchema = z.object({
  warning_days_before: z.number()
    .min(1, 'Minimum 1 day')
    .max(30, 'Maximum 30 days'),
  escalation_days_after: z.number()
    .min(1, 'Minimum 1 day')
    .max(60, 'Maximum 60 days'),
  second_escalation_days_after: z.number()
    .min(1, 'Minimum 1 day')
    .max(90, 'Maximum 90 days')
    .nullable(),
}).refine((data) => {
  if (data.second_escalation_days_after !== null) {
    return data.second_escalation_days_after > data.escalation_days_after;
  }
  return true;
}, {
  message: 'Second escalation must be after first escalation',
  path: ['second_escalation_days_after'],
});

type SLAConfigFormData = z.infer<typeof slaConfigSchema>;

interface SLAConfigEditDialogProps {
  config: ActionSLAConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: SLAConfigFormData & { priority: string }) => void;
  isSaving?: boolean;
}

function getPriorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case 'critical': return { bg: 'bg-red-500', text: 'text-red-600', label: '🔴' };
    case 'high': return { bg: 'bg-orange-500', text: 'text-orange-600', label: '🟠' };
    case 'medium': return { bg: 'bg-yellow-500', text: 'text-yellow-600', label: '🟡' };
    case 'low': return { bg: 'bg-green-500', text: 'text-green-600', label: '🟢' };
    default: return { bg: 'bg-gray-500', text: 'text-gray-600', label: '⚪' };
  }
}

export function SLAConfigEditDialog({
  config,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: SLAConfigEditDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SLAConfigFormData>({
    resolver: zodResolver(slaConfigSchema),
    defaultValues: {
      warning_days_before: 3,
      escalation_days_after: 2,
      second_escalation_days_after: null,
    },
  });

  useEffect(() => {
    if (config) {
      reset({
        warning_days_before: config.warning_days_before,
        escalation_days_after: config.escalation_days_after,
        second_escalation_days_after: config.second_escalation_days_after,
      });
    }
  }, [config, reset]);

  const watchedValues = watch();
  const priorityColors = config ? getPriorityColor(config.priority) : null;

  const onSubmit = (data: SLAConfigFormData) => {
    if (config) {
      onSave({ ...data, priority: config.priority });
    }
  };

  if (!config) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('adminActions.editSLAConfig', 'Edit SLA Configuration')}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge className={priorityColors?.bg}>
              {priorityColors?.label} {t(`investigation.priority.${config.priority}`, config.priority)}
            </Badge>
            {t('adminActions.configureThresholds', 'Configure escalation thresholds')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Visual Timeline Preview */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4 text-muted-foreground" />
              {t('adminActions.timelinePreview', 'Timeline Preview')}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-yellow-600" />
                -{watchedValues.warning_days_before || 0}d
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium">Due</span>
              <span className="text-muted-foreground">→</span>
              <span className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3 text-red-500" />
                +{watchedValues.escalation_days_after || 0}d
              </span>
              {watchedValues.second_escalation_days_after && (
                <>
                  <span className="text-muted-foreground">→</span>
                  <span className="flex items-center gap-1">
                    <Siren className="h-3 w-3 text-red-700" />
                    +{watchedValues.second_escalation_days_after}d
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid gap-4">
            {/* Warning Days */}
            <div className="grid gap-2">
              <Label htmlFor="warning_days_before" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                {t('adminActions.warningDaysBefore', 'Warning Days Before Due')}
              </Label>
              <Input
                id="warning_days_before"
                type="number"
                min={1}
                max={30}
                {...register('warning_days_before', { valueAsNumber: true })}
              />
              {errors.warning_days_before && (
                <p className="text-sm text-destructive">{errors.warning_days_before.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('adminActions.warningDaysHelp', 'Assignee receives reminder this many days before due date')}
              </p>
            </div>

            {/* Escalation L1 Days */}
            <div className="grid gap-2">
              <Label htmlFor="escalation_days_after" className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-red-500" />
                {t('adminActions.escalationDaysAfter', 'First Escalation Days After Due')}
              </Label>
              <Input
                id="escalation_days_after"
                type="number"
                min={1}
                max={60}
                {...register('escalation_days_after', { valueAsNumber: true })}
              />
              {errors.escalation_days_after && (
                <p className="text-sm text-destructive">{errors.escalation_days_after.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('adminActions.escalationL1Help', 'Manager receives alert this many days after due date')}
              </p>
            </div>

            {/* Escalation L2 Days */}
            <div className="grid gap-2">
              <Label htmlFor="second_escalation_days_after" className="flex items-center gap-2">
                <Siren className="h-4 w-4 text-red-700" />
                {t('adminActions.secondEscalationDays', 'Second Escalation Days After Due')}
              </Label>
              <Input
                id="second_escalation_days_after"
                type="number"
                min={1}
                max={90}
                {...register('second_escalation_days_after', { valueAsNumber: true })}
              />
              {errors.second_escalation_days_after && (
                <p className="text-sm text-destructive">{errors.second_escalation_days_after.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('adminActions.escalationL2Help', 'HSSE Manager receives critical alert')}
              </p>
            </div>
          </div>

          {/* Validation Errors */}
          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('adminActions.fixValidationErrors', 'Please fix the validation errors above')}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="h-4 w-4 me-2" />
              {isSaving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
