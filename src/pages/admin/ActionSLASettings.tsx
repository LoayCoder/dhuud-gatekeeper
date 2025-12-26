import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Settings, ArrowRight, AlertTriangle, CheckCircle, ArrowUp, Siren, BarChart3, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useActionSLAConfig, type ActionSLAConfig } from '@/hooks/use-action-sla-config';
import { SLATimelineVisual } from '@/components/sla/SLATimelineVisual';
import { SLAConfigEditDialog } from '@/components/sla/SLAConfigEditDialog';
import { cn } from '@/lib/utils';

function getPriorityConfig(priority: string) {
  switch (priority.toLowerCase()) {
    case 'critical': return { 
      variant: 'destructive' as const, 
      icon: '🔴', 
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800'
    };
    case 'high': return { 
      variant: 'destructive' as const, 
      icon: '🟠', 
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800'
    };
    case 'medium': return { 
      variant: 'secondary' as const, 
      icon: '🟡', 
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800'
    };
    case 'low': return { 
      variant: 'outline' as const, 
      icon: '🟢', 
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800'
    };
    default: return { 
      variant: 'outline' as const, 
      icon: '⚪', 
      bg: 'bg-muted',
      border: 'border-border'
    };
  }
}

export default function ActionSLASettings() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { slaConfigs, isLoading, updateSLAConfig } = useActionSLAConfig();
  const [editingConfig, setEditingConfig] = useState<ActionSLAConfig | null>(null);

  // Fetch current escalation statistics per priority
  const { data: escalationStats } = useQuery({
    queryKey: ['sla-escalation-stats', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return {};

      const { data, error } = await supabase
        .from('corrective_actions')
        .select('priority, escalation_level')
        .eq('tenant_id', profile.tenant_id)
        .not('status', 'in', '(completed,verified,closed)')
        .is('deleted_at', null);

      if (error) throw error;

      // Group by priority and count escalation levels
      const stats: Record<string, { total: number; level0: number; level1: number; level2: number }> = {};
      
      (data || []).forEach((action) => {
        const priority = action.priority || 'medium';
        if (!stats[priority]) {
          stats[priority] = { total: 0, level0: 0, level1: 0, level2: 0 };
        }
        stats[priority].total++;
        if (action.escalation_level === 0) stats[priority].level0++;
        else if (action.escalation_level === 1) stats[priority].level1++;
        else stats[priority].level2++;
      });

      return stats;
    },
    enabled: !!profile?.tenant_id,
  });

  const handleSave = (data: { priority: string; warning_days_before: number; escalation_days_after: number; second_escalation_days_after: number | null }) => {
    updateSLAConfig.mutate(data, {
      onSuccess: () => setEditingConfig(null),
    });
  };

  // Calculate totals for status cards
  const totalStats = Object.values(escalationStats || {}).reduce(
    (acc, curr) => ({
      total: acc.total + curr.total,
      onTrack: acc.onTrack + curr.level0,
      escalatedL1: acc.escalatedL1 + curr.level1,
      escalatedL2: acc.escalatedL2 + curr.level2,
    }),
    { total: 0, onTrack: 0, escalatedL1: 0, escalatedL2: 0 }
  );

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6" dir={direction}>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Use first config for timeline preview
  const previewConfig = slaConfigs[0] || {
    warning_days_before: 3,
    escalation_days_after: 2,
    second_escalation_days_after: 5,
  };

  return (
    <div className="container py-6 space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-8 w-8 text-primary" />
            {t('navigation.actionSLASettings', 'Action SLA Settings')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('adminActions.slaConfigDescription', 'Configure warning and escalation thresholds per priority level')}
          </p>
        </div>
        <Button onClick={() => navigate('/admin/sla-dashboard')} className="gap-2">
          <BarChart3 className="h-4 w-4" />
          {t('sla.viewDashboard', 'View Dashboard')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Current Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('sla.totalActive', 'Total Active')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">
              {t('sla.onTrack', 'On Track')}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{totalStats.onTrack}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">
              {t('sla.escalatedL1', 'Escalated L1')}
            </CardTitle>
            <ArrowUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{totalStats.escalatedL1}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-100 dark:bg-red-900/40">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-red-800 dark:text-red-300">
              {t('sla.escalatedL2', 'Escalated L2')}
            </CardTitle>
            <Siren className="h-4 w-4 text-red-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800 dark:text-red-300">{totalStats.escalatedL2}</div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('adminActions.escalationTimeline', 'SLA Escalation Timeline')}
          </CardTitle>
          <CardDescription>
            {t('adminActions.timelineDescription', 'Visual representation of how actions progress through SLA stages')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SLATimelineVisual
            warningDays={previewConfig.warning_days_before}
            escalationL1Days={previewConfig.escalation_days_after}
            escalationL2Days={previewConfig.second_escalation_days_after}
          />
        </CardContent>
      </Card>

      {/* SLA Configuration Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminActions.slaConfiguration', 'SLA Configuration by Priority')}</CardTitle>
          <CardDescription>
            {t('adminActions.slaConfigHelp', 'Define how many days before due date to send warnings, and after due date to escalate')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.priority', 'Priority')}</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    {t('adminActions.warningDays', 'Warning')}
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <ArrowUp className="h-4 w-4 text-red-500" />
                    {t('adminActions.escalationL1Short', 'Esc. L1')}
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Siren className="h-4 w-4 text-red-700" />
                    {t('adminActions.escalationL2Short', 'Esc. L2')}
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-1">
                          {t('sla.activeActions', 'Active')}
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t('sla.activeActionsTooltip', 'Number of active actions at each escalation level')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slaConfigs.map((config) => {
                const priorityConfig = getPriorityConfig(config.priority);
                const stats = escalationStats?.[config.priority] || { total: 0, level0: 0, level1: 0, level2: 0 };

                return (
                  <TableRow 
                    key={config.id} 
                    className={cn(priorityConfig.bg, "border", priorityConfig.border)}
                  >
                    <TableCell>
                      <Badge variant={priorityConfig.variant} className="gap-1">
                        {priorityConfig.icon} {t(`investigation.priority.${config.priority}`, config.priority)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                        <span className="font-medium">{config.warning_days_before}</span>
                        <span className="text-xs">{t('common.days', 'days')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                        <span className="font-medium">+{config.escalation_days_after}</span>
                        <span className="text-xs">{t('common.days', 'days')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {config.second_escalation_days_after ? (
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-200 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                          <span className="font-medium">+{config.second_escalation_days_after}</span>
                          <span className="text-xs">{t('common.days', 'days')}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="gap-1">
                                <span className="text-green-600">{stats.level0}</span>
                                <span className="text-muted-foreground">/</span>
                                <span className="text-red-500">{stats.level1}</span>
                                <span className="text-muted-foreground">/</span>
                                <span className="text-red-700">{stats.level2}</span>
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                  {t('sla.onTrack', 'On Track')}: {stats.level0}
                                </div>
                                <div className="flex items-center gap-2">
                                  <ArrowUp className="h-3 w-3 text-red-500" />
                                  {t('sla.escalatedL1', 'Escalated L1')}: {stats.level1}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Siren className="h-3 w-3 text-red-700" />
                                  {t('sla.escalatedL2', 'Escalated L2')}: {stats.level2}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button size="sm" variant="outline" onClick={() => setEditingConfig(config)}>
                        {t('common.edit', 'Edit')}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* How SLA Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t('adminActions.howSLAWorks', 'How SLA Escalation Works')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="font-semibold text-yellow-700 dark:text-yellow-400">
                  {t('adminActions.warningPhase', 'Warning Phase')}
                </span>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-400/80">
                {t('adminActions.warningPhaseDesc', 'Assignee receives email reminder when action is approaching due date')}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUp className="h-5 w-5 text-red-500" />
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {t('adminActions.escalationL1', 'Escalation Level 1')}
                </span>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400/80">
                {t('adminActions.escalationL1Desc', 'Manager receives email when action is overdue')}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700">
              <div className="flex items-center gap-2 mb-2">
                <Siren className="h-5 w-5 text-red-700" />
                <span className="font-semibold text-red-700 dark:text-red-300">
                  {t('adminActions.escalationL2', 'Escalation Level 2')}
                </span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300/80">
                {t('adminActions.escalationL2Desc', 'HSSE Manager receives critical alert for severely overdue actions')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <SLAConfigEditDialog
        config={editingConfig}
        open={!!editingConfig}
        onOpenChange={(open) => !open && setEditingConfig(null)}
        onSave={handleSave}
        isSaving={updateSLAConfig.isPending}
      />
    </div>
  );
}
