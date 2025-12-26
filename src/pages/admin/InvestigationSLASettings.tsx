import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvestigationSLAConfig, InvestigationSLAConfig } from '@/hooks/use-investigation-sla-config';
import { Clock, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InvestigationSLASettings() {
  const { t } = useTranslation();
  const { slaConfigs, isLoading, updateSLAConfig } = useInvestigationSLAConfig();
  const [editingConfig, setEditingConfig] = useState<InvestigationSLAConfig | null>(null);
  const [formData, setFormData] = useState({
    target_days: 0,
    warning_days_before: 0,
    escalation_days_after: 0,
    second_escalation_days_after: 0,
  });

  const handleEdit = (config: InvestigationSLAConfig) => {
    setEditingConfig(config);
    setFormData({
      target_days: config.target_days,
      warning_days_before: config.warning_days_before,
      escalation_days_after: config.escalation_days_after,
      second_escalation_days_after: config.second_escalation_days_after || 0,
    });
  };

  const handleSave = async () => {
    if (!editingConfig) return;
    
    if (formData.warning_days_before >= formData.target_days) {
      return;
    }
    if (formData.escalation_days_after <= 0) {
      return;
    }

    await updateSLAConfig.mutateAsync({
      severity_level: editingConfig.severity_level,
      target_days: formData.target_days,
      warning_days_before: formData.warning_days_before,
      escalation_days_after: formData.escalation_days_after,
      second_escalation_days_after: formData.second_escalation_days_after || null,
    });
    setEditingConfig(null);
  };

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
                    {config.second_escalation_days_after ? `+${config.second_escalation_days_after}d` : '—'}
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
                value={formData.target_days}
                onChange={(e) => setFormData(prev => ({ ...prev, target_days: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="warning_days">{t('sla.warningDaysBefore', 'Warning Days Before Target')}</Label>
              <Input
                id="warning_days"
                type="number"
                min={1}
                value={formData.warning_days_before}
                onChange={(e) => setFormData(prev => ({ ...prev, warning_days_before: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="escalation_days">{t('sla.escalationDaysAfter', 'L1 Escalation Days After Target')}</Label>
              <Input
                id="escalation_days"
                type="number"
                min={1}
                value={formData.escalation_days_after}
                onChange={(e) => setFormData(prev => ({ ...prev, escalation_days_after: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="second_escalation">{t('sla.secondEscalationDays', 'L2 Escalation Days')}</Label>
              <Input
                id="second_escalation"
                type="number"
                min={0}
                value={formData.second_escalation_days_after}
                onChange={(e) => setFormData(prev => ({ ...prev, second_escalation_days_after: parseInt(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                {t('sla.secondEscalationDesc', 'Leave as 0 to disable second escalation')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConfig(null)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSave} disabled={updateSLAConfig.isPending}>
              {t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
