import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Sparkles, Target } from 'lucide-react';
import { useKPITargetsAdmin, useSeedDefaultTargets } from '@/hooks/use-kpi-targets-admin';
import { KPIPageLayout } from '@/components/kpi/KPIPageLayout';
import { KPITargetCard } from '@/components/kpi/KPITargetCard';
import { AddKPIDialog } from '@/components/kpi/AddKPIDialog';

export default function KPITargetsManagement() {
  const { t } = useTranslation();
  const { data: targets, isLoading } = useKPITargetsAdmin();
  const seedMutation = useSeedDefaultTargets();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const hasTargets = targets && targets.length > 0;

  return (
    <KPIPageLayout activeTab="targets">
      {/* Actions bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-muted-foreground">
          {targets && (
            <span>
              {t('kpiAdmin.targetCount', '{{count}} KPI targets configured', { count: targets.length })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!hasTargets && !isLoading && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              <Sparkles className="h-4 w-4 me-2" />
              {t('kpiAdmin.seedDefaults', 'Add Default Targets')}
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t('kpiAdmin.addTarget', 'Add Target')}
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !hasTargets && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">
            {t('kpiAdmin.noTargets', 'No KPI Targets Configured')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            {t('kpiAdmin.noTargetsDescription', 'Set up target values and thresholds for your safety KPIs to track performance against goals.')}
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              <Sparkles className="h-4 w-4 me-2" />
              {t('kpiAdmin.seedDefaults', 'Add Default Targets')}
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 me-2" />
              {t('kpiAdmin.addManually', 'Add Manually')}
            </Button>
          </div>
        </div>
      )}

      {/* KPI Target Cards Grid */}
      {!isLoading && hasTargets && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {targets.map((target) => (
            <KPITargetCard key={target.id} target={target} />
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <AddKPIDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        existingTargets={targets ?? []}
      />
    </KPIPageLayout>
  );
}
