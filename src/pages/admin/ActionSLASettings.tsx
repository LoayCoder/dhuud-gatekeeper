import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, AlertTriangle, ArrowUp, Siren, Info, Lightbulb, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useActionSLAConfig, type ActionSLAConfig } from '@/hooks/use-action-sla-config';
import { SLAPageLayout } from '@/components/sla/SLAPageLayout';
import { SLATimelineVisual } from '@/components/sla/SLATimelineVisual';
import { SLAPriorityCard } from '@/components/sla/SLAPriorityCard';
import { SLAConfigEditDialog } from '@/components/sla/SLAConfigEditDialog';

export default function ActionSLASettings() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
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

  // Use first config for timeline preview
  const previewConfig = slaConfigs[0] || {
    warning_days_before: 3,
    escalation_days_after: 2,
    second_escalation_days_after: 5,
  };

  if (isLoading) {
    return (
      <SLAPageLayout
        title={t('navigation.actionSLASettings', 'Action SLA Settings')}
        description={t('adminActions.slaConfigDescription', 'Configure warning and escalation thresholds per priority level')}
        icon={<Clock className="h-8 w-8" />}
      >
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </SLAPageLayout>
    );
  }

  return (
    <SLAPageLayout
      title={t('navigation.actionSLASettings', 'Action SLA Settings')}
      description={t('adminActions.slaConfigDescription', 'Configure warning and escalation thresholds per priority level')}
      icon={<Clock className="h-8 w-8" />}
    >
      <div className="space-y-8">
        {/* Timeline Visual */}
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-700" />
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              {t('adminActions.escalationTimeline', 'SLA Escalation Timeline')}
            </CardTitle>
            <CardDescription>
              {t('adminActions.timelineDescription', 'Visual representation of how actions progress through SLA stages')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <SLATimelineVisual
              warningDays={previewConfig.warning_days_before}
              escalationL1Days={previewConfig.escalation_days_after}
              escalationL2Days={previewConfig.second_escalation_days_after}
            />
          </CardContent>
        </Card>

        {/* Priority Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            {t('adminActions.slaConfiguration', 'SLA Configuration by Priority')}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {slaConfigs.map((config) => (
              <SLAPriorityCard
                key={config.id}
                config={config}
                stats={escalationStats?.[config.priority]}
                onEdit={() => setEditingConfig(config)}
              />
            ))}
          </div>
        </div>

        {/* How It Works Section */}
        <Card>
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {t('adminActions.howSLAWorks', 'How SLA Escalation Works')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-900/10 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-yellow-500 text-white">
                    <Clock className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-yellow-700 dark:text-yellow-400">
                    {t('adminActions.warningPhase', 'Warning Phase')}
                  </span>
                </div>
                <p className="text-sm text-yellow-700/80 dark:text-yellow-400/80">
                  {t('adminActions.warningPhaseDesc', 'Assignee receives email reminder when action is approaching due date')}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-900/10 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-red-500 text-white">
                    <ArrowUp className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {t('adminActions.escalationL1', 'Escalation Level 1')}
                  </span>
                </div>
                <p className="text-sm text-red-600/80 dark:text-red-400/80">
                  {t('adminActions.escalationL1Desc', 'Manager receives email when action is overdue')}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-red-100 to-red-200/50 dark:from-red-900/40 dark:to-red-900/20 border border-red-300 dark:border-red-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-red-700 text-white">
                    <Siren className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-red-700 dark:text-red-300">
                    {t('adminActions.escalationL2', 'Escalation Level 2')}
                  </span>
                </div>
                <p className="text-sm text-red-700/80 dark:text-red-300/80">
                  {t('adminActions.escalationL2Desc', 'HSSE Manager receives urgent notification for critical attention')}
                </p>
              </div>
            </div>

            {/* Best Practices Accordion */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="best-practices">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <span>{t('sla.bestPractices', 'Best Practices')}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">{t('sla.doTitle', 'Do')}</h4>
                      <ul className="text-sm text-muted-foreground space-y-1.5 ps-4 list-disc">
                        <li>{t('sla.do1', 'Set shorter thresholds for critical priorities')}</li>
                        <li>{t('sla.do2', 'Review escalation patterns monthly')}</li>
                        <li>{t('sla.do3', 'Train managers on escalation handling')}</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">{t('sla.dontTitle', "Don't")}</h4>
                      <ul className="text-sm text-muted-foreground space-y-1.5 ps-4 list-disc">
                        <li>{t('sla.dont1', 'Set thresholds too tight causing alert fatigue')}</li>
                        <li>{t('sla.dont2', 'Ignore recurring escalations for same issues')}</li>
                        <li>{t('sla.dont3', 'Skip L2 configuration for critical items')}</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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
    </SLAPageLayout>
  );
}
