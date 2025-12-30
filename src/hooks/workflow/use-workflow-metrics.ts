import { useMemo } from 'react';
import { useWorkflowRealtime, WorkflowInstance, WorkflowLiveStatus } from './use-workflow-realtime';

export interface WorkflowMetrics {
  totalActive: number;
  completedToday: number;
  avgCompletionHours: number | null;
  bottlenecks: Array<{
    workflowKey: string;
    stepId: string;
    count: number;
  }>;
  statusBreakdown: {
    active: number;
    completed: number;
    paused: number;
    cancelled: number;
  };
  performanceTrend: 'improving' | 'stable' | 'declining';
  instancesByWorkflow: Record<string, number>;
}

export interface BottleneckAlert {
  workflowKey: string;
  stepId: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
}

interface UseWorkflowMetricsReturn {
  metrics: WorkflowMetrics;
  bottleneckAlerts: BottleneckAlert[];
  isLoading: boolean;
  isConnected: boolean;
  lastUpdate: Date | null;
}

export function useWorkflowMetrics(workflowKey?: string): UseWorkflowMetricsReturn {
  const { instances, liveStatus, isConnected, lastUpdate, connectionError } = useWorkflowRealtime(workflowKey);

  const metrics = useMemo((): WorkflowMetrics => {
    // Status breakdown
    const statusBreakdown = {
      active: instances.filter(i => i.status === 'active').length,
      completed: instances.filter(i => i.status === 'completed').length,
      paused: instances.filter(i => i.status === 'paused').length,
      cancelled: instances.filter(i => i.status === 'cancelled').length,
    };

    // Total active from live status
    const totalActive = liveStatus.reduce((sum, s) => sum + s.active_instances, 0);
    
    // Completed today from live status
    const completedToday = liveStatus.reduce((sum, s) => sum + s.completed_today, 0);

    // Average completion time
    const avgTimes = liveStatus
      .filter(s => s.avg_completion_time_hours !== null)
      .map(s => s.avg_completion_time_hours as number);
    const avgCompletionHours = avgTimes.length > 0
      ? avgTimes.reduce((sum, t) => sum + t, 0) / avgTimes.length
      : null;

    // Bottlenecks
    const bottlenecks = liveStatus
      .filter(s => s.bottleneck_step && s.bottleneck_count > 0)
      .map(s => ({
        workflowKey: s.workflow_key,
        stepId: s.bottleneck_step!,
        count: s.bottleneck_count,
      }))
      .sort((a, b) => b.count - a.count);

    // Performance trend (majority vote)
    const trends = liveStatus.map(s => s.performance_trend);
    const trendCounts = {
      improving: trends.filter(t => t === 'improving').length,
      stable: trends.filter(t => t === 'stable').length,
      declining: trends.filter(t => t === 'declining').length,
    };
    const performanceTrend = Object.entries(trendCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] as 'improving' | 'stable' | 'declining' || 'stable';

    // Instances by workflow
    const instancesByWorkflow = instances.reduce((acc, i) => {
      acc[i.workflow_key] = (acc[i.workflow_key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalActive: totalActive || statusBreakdown.active,
      completedToday,
      avgCompletionHours,
      bottlenecks,
      statusBreakdown,
      performanceTrend,
      instancesByWorkflow,
    };
  }, [instances, liveStatus]);

  const bottleneckAlerts = useMemo((): BottleneckAlert[] => {
    return metrics.bottlenecks.map(b => ({
      ...b,
      severity: b.count >= 10 ? 'high' : b.count >= 5 ? 'medium' : 'low',
    }));
  }, [metrics.bottlenecks]);

  return {
    metrics,
    bottleneckAlerts,
    isLoading: !lastUpdate && !connectionError,
    isConnected,
    lastUpdate,
  };
}
