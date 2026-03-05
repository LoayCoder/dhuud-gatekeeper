import { useMemo } from "react";

export interface ReconciliationIssue {
  id: string;
  type: 'mismatch' | 'missing' | 'stale' | 'inconsistent';
  severity: 'info' | 'warning' | 'error';
  source: string;
  target: string;
  field: string;
  sourceValue: unknown;
  targetValue: unknown;
  description: string;
}

export interface DataQualityScore {
  overall: number;
  completeness: number;
  consistency: number;
  timeliness: number;
}

interface DashboardDataProp {
  kpiIndicators?: Record<string, number>;
  lastUpdated?: string;
  incidents?: unknown[];
  actions?: unknown[];
  observations?: unknown[];
  inspections?: unknown[];
  [key: string]: unknown;
}

interface UseDataReconciliationParams {
  dashboardData?: DashboardDataProp;
  kpiValues?: Record<string, number>;
  executiveData?: unknown;
}

export function useDataReconciliation({
  dashboardData,
  kpiValues,
  executiveData,
}: UseDataReconciliationParams) {
  const issues = useMemo(() => {
    const detectedIssues: ReconciliationIssue[] = [];

    // Check for KPI value mismatches between dashboard and other sources
    if (kpiValues && dashboardData?.kpiIndicators) {
      Object.entries(kpiValues).forEach(([code, value]) => {
        const dashboardValue = dashboardData.kpiIndicators[code];
        if (dashboardValue !== undefined && Math.abs(dashboardValue - value) > 0.01) {
          detectedIssues.push({
            id: `kpi_mismatch_${code}`,
            type: 'mismatch',
            severity: 'warning',
            source: 'KPI Targets',
            target: 'Dashboard',
            field: code,
            sourceValue: value,
            targetValue: dashboardValue,
            description: `${code} shows ${value} in targets but ${dashboardValue} on dashboard`,
          });
        }
      });
    }

    // Check for stale data
    if (dashboardData?.lastUpdated) {
      const lastUpdate = new Date(dashboardData.lastUpdated);
      const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate > 24) {
        detectedIssues.push({
          id: 'stale_dashboard_data',
          type: 'stale',
          severity: 'info',
          source: 'Dashboard',
          target: 'Current Time',
          field: 'lastUpdated',
          sourceValue: lastUpdate.toISOString(),
          targetValue: new Date().toISOString(),
          description: `Dashboard data is ${Math.round(hoursSinceUpdate)} hours old`,
        });
      }
    }

    // Check for missing required data
    const requiredFields = ['incidents', 'actions', 'observations'] as const;
    requiredFields.forEach(field => {
      const fieldData = dashboardData?.[field] as unknown[] | undefined;
      const length = Array.isArray(fieldData) ? fieldData.length : 0;
      if (!fieldData || length === 0) {
        detectedIssues.push({
          id: `missing_${field}`,
          type: 'missing',
          severity: 'info',
          source: 'Dashboard',
          target: 'Required Data',
          field,
          sourceValue: length,
          targetValue: 'Expected > 0',
          description: `No ${field} data available for analysis`,
        });
      }
    });

    return detectedIssues;
  }, [dashboardData, kpiValues, executiveData]);

  const qualityScore = useMemo((): DataQualityScore => {
    if (!dashboardData) {
      return { overall: 0, completeness: 0, consistency: 0, timeliness: 100 };
    }

    // Completeness: Check required fields
    let completeFields = 0;
    const totalFields = 5;
    if (Array.isArray(dashboardData.incidents) && dashboardData.incidents.length > 0) completeFields++;
    if (Array.isArray(dashboardData.actions) && dashboardData.actions.length > 0) completeFields++;
    if (Array.isArray(dashboardData.observations) && dashboardData.observations.length > 0) completeFields++;
    if (dashboardData.kpiIndicators) completeFields++;
    if (Array.isArray(dashboardData.inspections) && dashboardData.inspections.length > 0) completeFields++;
    const completeness = (completeFields / totalFields) * 100;

    // Consistency: Based on issues found
    const consistencyIssues = issues.filter(i => i.type === 'mismatch' || i.type === 'inconsistent');
    const consistency = Math.max(0, 100 - (consistencyIssues.length * 10));

    // Timeliness: Based on stale data
    const stalenessIssues = issues.filter(i => i.type === 'stale');
    const timeliness = stalenessIssues.length === 0 ? 100 : 70;

    const overall = Math.round((completeness + consistency + timeliness) / 3);

    return { overall, completeness, consistency, timeliness };
  }, [dashboardData, issues]);

  const errorIssues = issues.filter(i => i.severity === 'error');
  const warningIssues = issues.filter(i => i.severity === 'warning');
  const infoIssues = issues.filter(i => i.severity === 'info');

  return {
    issues,
    qualityScore,
    errorIssues,
    warningIssues,
    infoIssues,
    hasIssues: issues.length > 0,
    hasErrors: errorIssues.length > 0,
  };
}
