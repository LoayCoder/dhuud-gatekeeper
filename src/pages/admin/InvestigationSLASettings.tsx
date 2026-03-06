import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { investigationSLASchema, InvestigationSLAValues } from './InvestigationSLASettingsSchema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvestigationSLAConfig, InvestigationSLAConfig } from '@/features/investigation';
import { Clock, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InvestigationSLASettings() {
  const { t } = useTranslation();
  const { slaConfigs, isLoading, updateSLAConfig } = useInvestigationSLAConfig();
  const [editingConfig, setEditingConfig] = useState<InvestigationSLAConfig | null>(null);

  const form = useForm<InvestigationSLAValues>({
    resolver: zodResolver(investigationSLASchema),
    defaultValues: {
      target_days: 0,
      warning_days_before: 0,
      escalation_days_after: 0,
      second_escalation_days_after: 0,
    }
  });

  const handleEdit = (config: InvestigationSLAConfig) => {
    setEditingConfig(config);
    form.reset({
      target_days: config.target_days,
      warning_days_before: config.warning_days_before,
      escalation_days_after: config.escalation_days_after,
      second_escalation_days_after: config.second_escalation_days_after || 0,
    });
  };

  const onSubmit = form.handleSubmit(async (data) => {
    if (!editingConfig) return;

    await updateSLAConfig.mutateAsync({
      severity_level: editingConfig.severity_level,
      target_days: data.target_days,
      warning_days_before: data.warning_days_before,
      escalation_days_after: data.escalation_days_after,
      second_escalation_days_after: data.second_escalation_days_after || null,
    });
    setEditingConfig(null);
  });

  const getSeverityDot = (severity: string) => {
    const colors: Record<string, string> = {
      'Level 1': 'bg-green-500',
      'Level 2': 'bg-blue-500',
      'Level 3': 'bg-yellow-500',
      'Level 4': 'bg-orange-500',
      'Level 5': 'bg-destructive',
    };
    return colors[severity] || 'bg-muted-foreground';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            {t('sla.investigationSlaSettings', 'Investigation SLA Settings')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('sla.investigationSlaDescription', 'Configure target completion dates and escalation thresholds for investigations based on incident severity')}
          </p>
        </div>
      </div>

      {/* SLA Configuration Table */}
      <Card className="border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-medium">{t('sla.severityConfigs', 'Severity Level Configurations')}</CardTitle>
          <CardDescription>
            {t('sla.severityConfigsDesc', 'Each severity level has different SLA thresholds. Higher severity incidents require faster resolution.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('sla.severityLevel', 'Severity')}</TableHead>
                <TableHead className="text-center">{t('sla.targetDays', 'Target')}</TableHead>
                <TableHead className="text-center">{t('sla.warningBefore', 'Warning')}</TableHead>
                <TableHead className="text-center">{t('sla.escalateAfter', 'L1 Escalation')}</TableHead>
                <TableHead className="text-center">{t('sla.secondEscalation', 'L2 Escalation')}</TableHead>
                <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slaConfigs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", getSeverityDot(config.severity_level))} />
                      <span className="font-medium">{config.severity_level}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {config.target_days}d
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {config.warning_days_before}d before
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    +{config.escalation_days_after}d
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {config.second_escalation_days_after ? `+${config.second_escalation_days_after}d` : 'â€”'}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(config)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingConfig} onOpenChange={() => setEditingConfig(null)}>
        <DialogContent>
          <form onSubmit={onSubmit}>
            <DialogHeader>
              <DialogTitle>
                {t('sla.editConfig', 'Edit SLA Configuration')} — {editingConfig?.severity_level}
              </DialogTitle>
              <DialogDescription>
                {t('sla.editConfigDesc', 'Update the SLA thresholds for this severity level')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="target_days">{t('sla.targetDays', 'Target Days')}</Label>
                <Input
                  id="target_days"
                  type="number"
                  min={1}
                  {...form.register('target_days', { valueAsNumber: true })}
                />
                {form.formState.errors.target_days && (
                  <p className="text-sm text-destructive">{form.formState.errors.target_days.message as string}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="warning_days">{t('sla.warningDaysBefore', 'Warning Days Before Target')}</Label>
                <Input
                  id="warning_days"
                  type="number"
                  min={1}
                  {...form.register('warning_days_before', { valueAsNumber: true })}
                />
                {form.formState.errors.warning_days_before && (
                  <p className="text-sm text-destructive">{form.formState.errors.warning_days_before.message as string}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="escalation_days">{t('sla.escalationDaysAfter', 'L1 Escalation Days After Target')}</Label>
                <Input
                  id="escalation_days"
                  type="number"
                  min={1}
                  {...form.register('escalation_days_after', { valueAsNumber: true })}
                />
                {form.formState.errors.escalation_days_after && (
                  <p className="text-sm text-destructive">{form.formState.errors.escalation_days_after.message as string}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="second_escalation">{t('sla.secondEscalationDays', 'L2 Escalation Days')}</Label>
                <Input
                  id="second_escalation"
                  type="number"
                  min={0}
                  {...form.register('second_escalation_days_after', { valueAsNumber: true })}
                />
                {form.formState.errors.second_escalation_days_after && (
                  <p className="text-sm text-destructive">{form.formState.errors.second_escalation_days_after.message as string}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('sla.secondEscalationDesc', 'Leave as 0 to disable second escalation')}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingConfig(null)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={updateSLAConfig.isPending}>
                {t('common.save', 'Save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

