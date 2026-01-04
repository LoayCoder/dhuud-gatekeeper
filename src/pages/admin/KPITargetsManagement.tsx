import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Sparkles, Target, Brain, RefreshCw } from 'lucide-react';
import { useKPITargetsAdmin, useSeedDefaultTargets } from '@/hooks/use-kpi-targets-admin';
import { useKPIEvaluation } from '@/hooks/use-kpi-evaluation';
import { KPIPageLayout } from '@/components/kpi/KPIPageLayout';
import { KPITargetCard } from '@/components/kpi/KPITargetCard';
import { AddKPIDialog } from '@/components/kpi/AddKPIDialog';
import { KPIPerformanceSummary } from '@/components/kpi/KPIPerformanceSummary';
import { KPIEvaluationPanel } from '@/components/kpi/KPIEvaluationPanel';

export default function KPITargetsManagement() {
  const { t } = useTranslation();
  const { data: targets, isLoading } = useKPITargetsAdmin();
  const seedMutation = useSeedDefaultTargets();
  const { evaluations, summary, isLoading: isEvaluating, evaluate } = useKPIEvaluation();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const hasTargets = targets && targets.length > 0;

  // Mock current values for evaluation (would come from dashboard data in production)
  const handleEvaluate = () => {
    if (!targets) return;
    
    // Generate mock current values for demonstration
    const mockCurrentValues: Record<string, number> = {};
    targets.forEach(target => {
      // Simulate current values with some variance from target
      const variance = (Math.random() - 0.5) * 0.4; // -20% to +20%
      mockCurrentValues[target.kpi_code] = target.target_value * (1 + variance);
    });

    evaluate({ targets, currentValues: mockCurrentValues });
  };

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
          {hasTargets && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEvaluate}
              disabled={isEvaluating}
            >
              {isEvaluating ? (
                <RefreshCw className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <Brain className="h-4 w-4 me-2" />
              )}
              {t('kpiAdmin.aiEvaluate', 'AI Evaluate')}
            </Button>
          )}
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

      {/* AI Performance Summary */}
      {summary && (
        <div className="mb-6">
          <KPIPerformanceSummary summary={summary} isLoading={isEvaluating} />
        </div>
      )}

      {/* AI Evaluation Panel */}
      {evaluations.length > 0 && (
        <div className="mb-6">
          <KPIEvaluationPanel evaluations={evaluations} isLoading={isEvaluating} />
        </div>
      )}

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
