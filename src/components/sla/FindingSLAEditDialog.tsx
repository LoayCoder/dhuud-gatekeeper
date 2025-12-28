import { useEffect } from 'react';
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
import { Clock, AlertTriangle, ArrowUp, Siren, Save, Info, Target } from 'lucide-react';
import type { FindingSLAConfig } from '@/hooks/use-finding-sla-config';

const findingSLASchema = z.object({
  target_days: z.number()
    .min(1, 'Minimum 1 day')
    .max(90, 'Maximum 90 days'),
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
  return data.warning_days_before < data.target_days;
}, {
  message: 'Warning must be before target days',
  path: ['warning_days_before'],
}).refine((data) => {
  if (data.second_escalation_days_after !== null) {
    return data.second_escalation_days_after > data.escalation_days_after;
  }
  return true;
}, {
  message: 'Second escalation must be after first escalation',
  path: ['second_escalation_days_after'],
});

type FindingSLAFormData = z.infer<typeof findingSLASchema>;

interface FindingSLAEditDialogProps {
  config: FindingSLAConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: FindingSLAFormData & { classification: string }) => void;
  isSaving?: boolean;
}

function getClassificationLabel(classification: string): string {
  switch (classification) {
    case 'critical_nc': return 'Critical NC';
    case 'major_nc': return 'Major NC';
    case 'minor_nc': return 'Minor NC';
    case 'observation': return 'Observation';
    default: return classification;
  }
}

function getClassificationColor(classification: string) {
  switch (classification) {
    case 'critical_nc': return 'bg-destructive';
    case 'major_nc': return 'bg-orange-500';
    case 'minor_nc': return 'bg-yellow-500';
    case 'observation': return 'bg-blue-500';
    default: return 'bg-muted-foreground';
  }
}

export function FindingSLAEditDialog({
  config,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: FindingSLAEditDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FindingSLAFormData>({
    resolver: zodResolver(findingSLASchema),
    defaultValues: {
      target_days: 7,
      warning_days_before: 2,
      escalation_days_after: 2,
      second_escalation_days_after: null,
    },
  });

  useEffect(() => {
    if (config) {
      reset({
        target_days: config.target_days,
        warning_days_before: config.warning_days_before,
        escalation_days_after: config.escalation_days_after,
        second_escalation_days_after: config.second_escalation_days_after,
      });
    }
  }, [config, reset]);

  const watchedValues = watch();

  const onSubmit = (data: FindingSLAFormData) => {
    if (config) {
      onSave({ ...data, classification: config.classification });
    }
  };

  if (!config) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('sla.editFindingConfig', 'Edit Finding SLA Configuration')}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge className={getClassificationColor(config.classification)}>
              {t(`findings.classification.${config.classification}`, getClassificationLabel(config.classification))}
            </Badge>
            {t('sla.configureThresholds', 'Configure escalation thresholds')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Visual Timeline Preview */}
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4 text-muted-foreground" />
              {t('sla.timelinePreview', 'Timeline Preview')}
            </div>
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-yellow-600" />
                -{watchedValues.warning_days_before || 0}d
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="flex items-center gap-1 font-medium">
                <Target className="h-3 w-3 text-primary" />
                {watchedValues.target_days || 0}d
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3 text-orange-500" />
                +{watchedValues.escalation_days_after || 0}d
              </span>
              {watchedValues.second_escalation_days_after && (
                <>
                  <span className="text-muted-foreground">→</span>
                  <span className="flex items-center gap-1">
                    <Siren className="h-3 w-3 text-destructive" />
                    +{watchedValues.second_escalation_days_after}d
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid gap-4">
            {/* Target Days */}
            <div className="grid gap-2">
              <Label htmlFor="target_days" className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                {t('sla.targetDaysLabel', 'Target Days to Close')}
              </Label>
              <Input
                id="target_days"
                type="number"
                min={1}
                max={90}
                {...register('target_days', { valueAsNumber: true })}
              />
              {errors.target_days && (
                <p className="text-sm text-destructive">{errors.target_days.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('sla.targetDaysHelp', 'Number of days to resolve this finding type')}
              </p>
            </div>

            {/* Warning Days */}
            <div className="grid gap-2">
              <Label htmlFor="warning_days_before" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                {t('sla.warningDaysBefore', 'Warning Days Before Due')}
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
                {t('sla.warningDaysHelp', 'Assignee receives reminder this many days before due date')}
              </p>
            </div>

            {/* Escalation L1 Days */}
            <div className="grid gap-2">
              <Label htmlFor="escalation_days_after" className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-orange-500" />
                {t('sla.escalationDaysAfter', 'First Escalation Days After Due')}
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
                {t('sla.escalationL1Help', 'Manager receives alert this many days after due date')}
              </p>
            </div>

            {/* Escalation L2 Days */}
            <div className="grid gap-2">
              <Label htmlFor="second_escalation_days_after" className="flex items-center gap-2">
                <Siren className="h-4 w-4 text-destructive" />
                {t('sla.secondEscalationDays', 'Second Escalation Days After Due')}
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
                {t('sla.escalationL2Help', 'HSSE Manager receives critical alert')}
              </p>
            </div>
          </div>

          {/* Validation Errors */}
          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('sla.fixValidationErrors', 'Please fix the validation errors above')}
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
