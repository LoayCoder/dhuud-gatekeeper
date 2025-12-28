import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Settings2, AlertTriangle } from 'lucide-react';
import { SLAPageLayout } from '@/components/sla/SLAPageLayout';
import { FindingSLACard } from '@/components/sla/FindingSLACard';
import { FindingSLAEditDialog } from '@/components/sla/FindingSLAEditDialog';
import { useFindingSLAConfigs, useUpdateFindingSLAConfig, FindingSLAConfig } from '@/hooks/use-finding-sla-config';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function FindingSLASettings() {
  const { t } = useTranslation();
  const { data: configs, isLoading, error } = useFindingSLAConfigs();
  const updateConfig = useUpdateFindingSLAConfig();
  const [editingConfig, setEditingConfig] = useState<FindingSLAConfig | null>(null);

  const handleSave = async (data: {
    classification: string;
    target_days: number;
    warning_days_before: number;
    escalation_days_after: number;
    second_escalation_days_after: number | null;
  }) => {
    await updateConfig.mutateAsync(data);
    setEditingConfig(null);
  };

  if (error) {
    return (
      <SLAPageLayout
        title={t('sla.findingsConfig.title', 'Finding SLA Settings')}
        description={t('sla.findingsConfig.description', 'Configure SLA thresholds for inspection findings')}
        icon={<Clock className="h-6 w-6" />}
      >
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('common.error', 'Error')}</AlertTitle>
          <AlertDescription>{t('sla.configLoadError', 'Failed to load SLA configurations')}</AlertDescription>
        </Alert>
      </SLAPageLayout>
    );
  }

  return (
    <SLAPageLayout
      title={t('sla.findingsConfig.title', 'Finding SLA Settings')}
      description={t('sla.findingsConfig.description', 'Configure SLA thresholds for inspection findings')}
      icon={<Settings2 className="h-6 w-6" />}
    >
      <div className="space-y-6">
        {/* Info Banner */}
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>{t('sla.findingsConfig.infoTitle', 'How Finding SLA Works')}</AlertTitle>
          <AlertDescription className="text-sm">
            {t('sla.findingsConfig.infoDescription', 
              'SLA configurations define when warnings are sent before the due date and when escalations occur after the due date. Each finding classification can have different thresholds.'
            )}
          </AlertDescription>
        </Alert>

        {/* SLA Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </>
          ) : (
            configs?.map((config) => (
              <FindingSLACard
                key={config.id}
                config={config}
                onEdit={() => setEditingConfig(config)}
              />
            ))
          )}
        </div>

        {/* Edit Dialog */}
        <FindingSLAEditDialog
          config={editingConfig}
          open={!!editingConfig}
          onOpenChange={(open) => !open && setEditingConfig(null)}
          onSave={handleSave}
          isSaving={updateConfig.isPending}
        />
      </div>
    </SLAPageLayout>
  );
}
