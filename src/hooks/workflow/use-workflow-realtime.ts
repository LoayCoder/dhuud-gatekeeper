import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

export interface WorkflowInstance {
  id: string;
  tenant_id: string;
  workflow_id: string | null;
  workflow_key: string;
  entity_type: string;
  entity_id: string;
  current_step_id: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  started_at: string;
  completed_at: string | null;
  started_by: string | null;
  participants: unknown[];
  metadata: Record<string, unknown>;
}

export interface WorkflowStepHistory {
  id: string;
  instance_id: string;
  step_id: string;
  step_name: string | null;
  actor_id: string | null;
  action_taken: string | null;
  notes: string | null;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
}

export interface WorkflowLiveStatus {
  id: string;
  workflow_key: string;
  active_instances: number;
  completed_today: number;
  avg_completion_time_hours: number | null;
  bottleneck_step: string | null;
  bottleneck_count: number;
  performance_trend: 'improving' | 'stable' | 'declining';
  last_updated: string;
}

interface UseWorkflowRealtimeReturn {
  instances: WorkflowInstance[];
  liveStatus: WorkflowLiveStatus[];
  isConnected: boolean;
  connectionState: ConnectionState;
  lastUpdate: Date | null;
  connectionError: string | null;
  refetch: () => Promise<void>;
}

export function useWorkflowRealtime(workflowKey?: string): UseWorkflowRealtimeReturn {
  const { profile } = useAuth();
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [liveStatus, setLiveStatus] = useState<WorkflowLiveStatus[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      // Fetch active workflow instances
      let instancesQuery = supabase
        .from('workflow_instances')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('started_at', { ascending: false })
        .limit(100);

      if (workflowKey) {
        instancesQuery = instancesQuery.eq('workflow_key', workflowKey);
      }

      const { data: instancesData, error: instancesError } = await instancesQuery;

      if (instancesError) throw instancesError;
      setInstances((instancesData || []) as WorkflowInstance[]);

      // Fetch live status
      let statusQuery = supabase
        .from('workflow_live_status')
        .select('*')
        .eq('tenant_id', profile.tenant_id);

      if (workflowKey) {
        statusQuery = statusQuery.eq('workflow_key', workflowKey);
      }

      const { data: statusData, error: statusError } = await statusQuery;

      if (statusError) throw statusError;
      setLiveStatus((statusData || []) as WorkflowLiveStatus[]);
      setLastUpdate(new Date());
      setConnectionError(null);
    } catch (error) {
      console.error('Failed to fetch workflow data:', error);
      setConnectionError(error instanceof Error ? error.message : 'Failed to fetch data');
    }
  }, [profile?.tenant_id, workflowKey]);

  useEffect(() => {
    // If no tenant_id yet, stay in idle state
    if (!profile?.tenant_id) {
      setConnectionState('idle');
      return;
    }

    setConnectionState('connecting');
    fetchData();

    // Set up real-time subscriptions
    const channel: RealtimeChannel = supabase
      .channel('workflow-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_instances',
        },
        (payload) => {
          setLastUpdate(new Date());
          
          if (payload.eventType === 'INSERT') {
            const newInstance = payload.new as WorkflowInstance;
            if (newInstance.tenant_id === profile.tenant_id) {
              if (!workflowKey || newInstance.workflow_key === workflowKey) {
                setInstances(prev => [newInstance, ...prev]);
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedInstance = payload.new as WorkflowInstance;
            setInstances(prev => 
              prev.map(i => i.id === updatedInstance.id ? updatedInstance : i)
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setInstances(prev => prev.filter(i => i.id !== deletedId));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_live_status',
        },
        (payload) => {
          setLastUpdate(new Date());
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newStatus = payload.new as WorkflowLiveStatus;
            setLiveStatus(prev => {
              const existing = prev.find(s => s.id === newStatus.id);
              if (existing) {
                return prev.map(s => s.id === newStatus.id ? newStatus : s);
              }
              return [...prev, newStatus];
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionState('connected');
          setConnectionError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionState('error');
          setConnectionError('Real-time connection failed');
        } else if (status === 'TIMED_OUT') {
          setConnectionState('error');
          setConnectionError('Connection timed out');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id, workflowKey, fetchData]);

  return {
    instances,
    liveStatus,
    isConnected: connectionState === 'connected',
    connectionState,
    lastUpdate,
    connectionError,
    refetch: fetchData,
  };
}
