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
import { SLATimelineVisual } from '@/components/sla/SLATimelineVisual';
import { AlertTriangle, Clock, Edit2, Shield, Search } from 'lucide-react';

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
    
    // Validation
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

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      'Level 1': 'bg-green-500/10 text-green-600 border-green-500/20',
      'Level 2': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'Level 3': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      'Level 4': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      'Level 5': 'bg-red-500/10 text-red-600 border-red-500/20',
    };
    return colors[severity] || 'bg-muted text-muted-foreground';
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
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" />
            {t('sla.investigationSlaSettings', 'Investigation SLA Settings')}
          </h1>
          <p className="text-muted-foreground">
            {t('sla.investigationSlaDescription', 'Configure target completion dates and escalation thresholds for investigations based on incident severity')}
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('sla.targetDays', 'Target Days')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {t('sla.targetDaysHelp', 'Number of days from investigation start to expected completion')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('sla.warningDays', 'Warning Days')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {t('sla.warningDaysHelp', 'Days before target date to send warning notification to investigator')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('sla.escalation', 'Escalation')}</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {t('sla.escalationHelp', 'Days after target date to escalate to HSSE managers via Email & WhatsApp')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SLA Configuration Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sla.severityConfigs', 'Severity Level Configurations')}</CardTitle>
          <CardDescription>
            {t('sla.severityConfigsDesc', 'Each severity level has different SLA thresholds. Higher severity incidents require faster resolution.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('sla.severityLevel', 'Severity Level')}</TableHead>
                <TableHead className="text-center">{t('sla.targetDays', 'Target Days')}</TableHead>
                <TableHead className="text-center">{t('sla.warningBefore', 'Warning Before')}</TableHead>
                <TableHead className="text-center">{t('sla.escalateAfter', 'Escalate After')}</TableHead>
                <TableHead className="text-center">{t('sla.secondEscalation', '2nd Escalation')}</TableHead>
                <TableHead className="text-center">{t('sla.timeline', 'Timeline')}</TableHead>
                <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slaConfigs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>
                    <Badge className={getSeverityColor(config.severity_level)}>
                      {config.severity_level}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {config.target_days} {t('common.days', 'days')}
                  </TableCell>
                  <TableCell className="text-center text-yellow-600">
                    {config.warning_days_before} {t('common.days', 'days')}
                  </TableCell>
                  <TableCell className="text-center text-orange-600">
                    +{config.escalation_days_after} {t('common.days', 'days')}
                  </TableCell>
                  <TableCell className="text-center text-red-600">
                    {config.second_escalation_days_after ? `+${config.second_escalation_days_after} ${t('common.days', 'days')}` : '-'}
                  </TableCell>
                  <TableCell>
                    <SLATimelineVisual
                      warningDays={config.warning_days_before}
                      escalationL1Days={config.escalation_days_after}
                      escalationL2Days={config.second_escalation_days_after}
                    />
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
              {t('sla.editConfig', 'Edit SLA Configuration')} - {editingConfig?.severity_level}
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
              <p className="text-xs text-muted-foreground">
                {t('sla.targetDaysDesc', 'Days from start to expected completion')}
              </p>
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
              <Label htmlFor="escalation_days">{t('sla.escalationDaysAfter', 'Escalation Days After Target')}</Label>
              <Input
                id="escalation_days"
                type="number"
                min={1}
                value={formData.escalation_days_after}
                onChange={(e) => setFormData(prev => ({ ...prev, escalation_days_after: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="second_escalation">{t('sla.secondEscalationDays', 'Second Escalation Days')}</Label>
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
            {/* Preview Timeline */}
            <div className="pt-4 border-t">
              <Label className="mb-2 block">{t('sla.previewTimeline', 'Preview Timeline')}</Label>
              <SLATimelineVisual
                warningDays={formData.warning_days_before}
                escalationL1Days={formData.escalation_days_after}
                escalationL2Days={formData.second_escalation_days_after || null}
              />
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
