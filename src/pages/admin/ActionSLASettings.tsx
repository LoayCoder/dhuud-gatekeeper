import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useActionSLAConfig, type ActionSLAConfig } from '@/hooks/use-action-sla-config';
import { SLAPageLayout } from '@/components/sla/SLAPageLayout';
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

  if (isLoading) {
    return (
      <SLAPageLayout
        title={t('navigation.actionSLASettings', 'Action SLA Settings')}
        description={t('adminActions.slaConfigDescription', 'Configure warning and escalation thresholds per priority level')}
        icon={<Clock className="h-5 w-5 text-muted-foreground" />}
      >
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
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
      icon={<Clock className="h-5 w-5 text-muted-foreground" />}
    >
      <div className="space-y-6">
        {/* Priority Cards */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            {t('adminActions.slaConfiguration', 'Configuration by Priority')}
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

        {/* Info Section */}
        <Card className="border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              {t('adminActions.howSLAWorks', 'How It Works')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <p className="font-medium">{t('sla.warning', 'Warning')}</p>
                <p className="text-muted-foreground text-xs">
                  {t('adminActions.warningPhaseDesc', 'Assignee receives reminder before due date')}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">{t('sla.escalatedL1', 'L1 Escalation')}</p>
                <p className="text-muted-foreground text-xs">
                  {t('adminActions.escalationL1Desc', 'Manager notified when action is overdue')}
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-medium">{t('sla.escalatedL2', 'L2 Escalation')}</p>
                <p className="text-muted-foreground text-xs">
                  {t('adminActions.escalationL2Desc', 'HSSE Manager receives urgent notification')}
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
    </SLAPageLayout>
  );
}
