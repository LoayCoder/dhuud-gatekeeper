import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Save, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useActionSLAConfig, type ActionSLAConfig } from '@/hooks/use-action-sla-config';

function getPriorityVariant(priority: string): 'destructive' | 'secondary' | 'outline' | 'default' {
  switch (priority.toLowerCase()) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
}

export default function ActionSLASettings() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { slaConfigs, isLoading, updateSLAConfig } = useActionSLAConfig();
  const [editingPriority, setEditingPriority] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ActionSLAConfig>>({});

  const handleEdit = (config: ActionSLAConfig) => {
    setEditingPriority(config.priority);
    setEditValues({
      warning_days_before: config.warning_days_before,
      escalation_days_after: config.escalation_days_after,
      second_escalation_days_after: config.second_escalation_days_after,
    });
  };

  const handleCancel = () => {
    setEditingPriority(null);
    setEditValues({});
  };

  const handleSave = (priority: string) => {
    updateSLAConfig.mutate({
      priority,
      warning_days_before: editValues.warning_days_before || 3,
      escalation_days_after: editValues.escalation_days_after || 2,
      second_escalation_days_after: editValues.second_escalation_days_after || 5,
    });
    setEditingPriority(null);
    setEditValues({});
  };

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6" dir={direction}>
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6" dir={direction}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Clock className="h-8 w-8 text-primary" />
          {t('navigation.actionSLASettings', 'Action SLA Settings')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('adminActions.slaConfigDescription', 'Configure warning and escalation thresholds per priority level')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('adminActions.slaConfiguration', 'Action SLA Configuration')}</CardTitle>
          <CardDescription>
            {t('adminActions.slaConfigHelp', 'Define how many days before due date to send warnings, and after due date to escalate')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.priority', 'Priority')}</TableHead>
                <TableHead className="text-center">{t('adminActions.warningDaysBefore', 'Warning Days Before Due')}</TableHead>
                <TableHead className="text-center">{t('adminActions.escalationDaysAfter', 'Escalation Days After Due')}</TableHead>
                <TableHead className="text-center">{t('adminActions.secondEscalationDays', 'Second Escalation Days')}</TableHead>
                <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slaConfigs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>
                    <Badge variant={getPriorityVariant(config.priority)}>
                      {t(`investigation.priority.${config.priority}`, config.priority)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {editingPriority === config.priority ? (
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={editValues.warning_days_before || 0}
                        onChange={(e) => setEditValues({ ...editValues, warning_days_before: parseInt(e.target.value) || 0 })}
                        className="w-20 mx-auto text-center"
                      />
                    ) : (
                      <span className="font-medium">{config.warning_days_before}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {editingPriority === config.priority ? (
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        value={editValues.escalation_days_after || 0}
                        onChange={(e) => setEditValues({ ...editValues, escalation_days_after: parseInt(e.target.value) || 0 })}
                        className="w-20 mx-auto text-center"
                      />
                    ) : (
                      <span className="font-medium">{config.escalation_days_after}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {editingPriority === config.priority ? (
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        value={editValues.second_escalation_days_after || 0}
                        onChange={(e) => setEditValues({ ...editValues, second_escalation_days_after: parseInt(e.target.value) || 0 })}
                        className="w-20 mx-auto text-center"
                      />
                    ) : (
                      <span className="font-medium">{config.second_escalation_days_after || '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    {editingPriority === config.priority ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(config.priority)}
                          disabled={updateSLAConfig.isPending}
                        >
                          <Save className="h-4 w-4 me-1" />
                          {t('common.save', 'Save')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancel}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleEdit(config)}>
                        {t('common.edit', 'Edit')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('adminActions.howSLAWorks', 'How SLA Escalation Works')}</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><strong>{t('adminActions.warningPhase', 'Warning Phase')}:</strong> {t('adminActions.warningPhaseDesc', 'Assignee receives email reminder when action is approaching due date')}</li>
            <li><strong>{t('adminActions.escalationL1', 'Escalation Level 1')}:</strong> {t('adminActions.escalationL1Desc', 'Manager receives email when action is overdue')}</li>
            <li><strong>{t('adminActions.escalationL2', 'Escalation Level 2')}:</strong> {t('adminActions.escalationL2Desc', 'HSSE Manager receives critical alert for severely overdue actions')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
