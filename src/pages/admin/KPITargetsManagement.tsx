import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useKPITargetsAdmin, useUpdateKPITarget, KPI_METADATA } from '@/hooks/use-kpi-targets-admin';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Target, TrendingDown, TrendingUp, Info, Check, X, Edit2 } from 'lucide-react';

export default function KPITargetsManagement() {
  const { t } = useTranslation();
  const { data: targets, isLoading } = useKPITargetsAdmin();
  const updateMutation = useUpdateKPITarget();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    target_value: number;
    warning_threshold: number;
    critical_threshold: number;
  } | null>(null);

  const handleEdit = (target: { id: string; target_value: number; warning_threshold: number | null; critical_threshold: number | null }) => {
    setEditingId(target.id);
    setEditValues({
      target_value: target.target_value,
      warning_threshold: target.warning_threshold ?? 0,
      critical_threshold: target.critical_threshold ?? 0,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues(null);
  };

  const handleSave = async (id: string) => {
    if (!editValues) return;

    await updateMutation.mutateAsync({
      id,
      ...editValues,
    });

    setEditingId(null);
    setEditValues(null);
  };

  const getKPILabel = (code: string): string => {
    const meta = KPI_METADATA[code];
    if (meta) return meta.name;
    
    const labels: Record<string, string> = {
      trir: t('kpiDashboard.trir', 'TRIR'),
      ltifr: t('kpiDashboard.ltifr', 'LTIFR'),
      dart_rate: t('kpiDashboard.dart', 'DART Rate'),
      fatality_rate: t('kpiDashboard.fatalityRate', 'Fatality Rate'),
      severity_rate: t('kpiDashboard.severityRate', 'Severity Rate'),
      near_miss_rate: t('kpiDashboard.nearMissRate', 'Near Miss Rate'),
      action_closure_pct: t('kpiDashboard.actionClosurePct', 'Action Closure %'),
      observation_completion_pct: t('kpiDashboard.observationPct', 'Observation Completion %'),
    };
    return labels[code] || code;
  };

  const getKPITooltip = (code: string): string => {
    const meta = KPI_METADATA[code];
    if (meta) return meta.description;
    return '';
  };

  const getComparisonType = (code: string): 'less_than' | 'greater_than' => {
    const meta = KPI_METADATA[code];
    return meta?.comparison_type ?? 'less_than';
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Target className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t('kpiAdmin.title', 'KPI Targets Management')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('kpiAdmin.description', 'Configure target values and alert thresholds for safety KPIs')}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('kpiAdmin.kpiThresholds', 'KPI Thresholds')}</CardTitle>
          <CardDescription>
            {t('kpiAdmin.thresholdsDescription', 'Set target values and warning/critical thresholds for each KPI')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('kpiAdmin.kpiCode', 'KPI')}</TableHead>
                  <TableHead>{t('kpiAdmin.comparison', 'Type')}</TableHead>
                  <TableHead className="text-end">{t('kpiAdmin.targetValue', 'Target')}</TableHead>
                  <TableHead className="text-end">{t('kpiAdmin.warningThreshold', 'Warning')}</TableHead>
                  <TableHead className="text-end">{t('kpiAdmin.criticalThreshold', 'Critical')}</TableHead>
                  <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets?.map((target) => (
                  <TableRow key={target.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getKPILabel(target.kpi_code)}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            {getKPITooltip(target.kpi_code)}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getComparisonType(target.kpi_code) === 'less_than' ? 'secondary' : 'outline'}>
                        {getComparisonType(target.kpi_code) === 'less_than' ? (
                          <span className="flex items-center gap-1">
                            <TrendingDown className="h-3 w-3" />
                            {t('kpiAdmin.lowerIsBetter', 'Lower is Better')}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {t('kpiAdmin.higherIsBetter', 'Higher is Better')}
                          </span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      {editingId === target.id ? (
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24 text-end ms-auto"
                          value={editValues?.target_value ?? 0}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev!,
                              target_value: parseFloat(e.target.value) || 0,
                            }))
                          }
                        />
                      ) : (
                        <span className="font-mono">{target.target_value}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      {editingId === target.id ? (
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24 text-end ms-auto"
                          value={editValues?.warning_threshold ?? 0}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev!,
                              warning_threshold: parseFloat(e.target.value) || 0,
                            }))
                          }
                        />
                      ) : (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                          {target.warning_threshold ?? '-'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      {editingId === target.id ? (
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24 text-end ms-auto"
                          value={editValues?.critical_threshold ?? 0}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev!,
                              critical_threshold: parseFloat(e.target.value) || 0,
                            }))
                          }
                        />
                      ) : (
                        <Badge variant="destructive">
                          {target.critical_threshold ?? '-'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      {editingId === target.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancel}
                            disabled={updateMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSave(target.id)}
                            disabled={updateMutation.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(target)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
