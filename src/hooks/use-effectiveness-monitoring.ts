import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface MonitoringCheck {
  id: string;
  incident_id: string;
  tenant_id: string;
  scheduled_date: string;
  check_type: string;
  completed_at: string | null;
  completed_by: string | null;
  status: string;
  findings: string | null;
  recurrence_found: boolean;
}

export interface MonitoringPeriodConfig {
  id: string;
  tenant_id: string;
  severity_level: string;
  monitoring_days: number;
  check_interval_days: number;
  is_active: boolean;
}

export interface CompleteMonitoringCheckInput {
  checkId: string;
  findings: string;
  recurrenceFound: boolean;
}

export interface StartMonitoringInput {
  incidentId: string;
  periodDays: number;
}

// Default monitoring periods by severity
const DEFAULT_MONITORING_PERIODS: Record<string, { days: number; interval: number }> = {
  'Level 1': { days: 30, interval: 15 },
  'Level 2': { days: 30, interval: 10 },
  'Level 3': { days: 60, interval: 14 },
  'Level 4': { days: 90, interval: 14 },
  'Level 5': { days: 90, interval: 7 },
};

export function useMonitoringPeriodConfigs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['monitoring-period-configs'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('monitoring_period_configs')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (error) throw error;
      return (data || []) as MonitoringPeriodConfig[];
    },
    enabled: !!user?.id,
  });
}

export function useMonitoringChecks(incidentId: string | null) {
  return useQuery({
    queryKey: ['monitoring-checks', incidentId],
    queryFn: async () => {
      if (!incidentId) return [];

      const { data, error } = await supabase
        .from('monitoring_check_schedule')
        .select('*')
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return (data || []) as MonitoringCheck[];
    },
    enabled: !!incidentId,
  });
}

export function useStartMonitoringPeriod() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: StartMonitoringInput) => {
      const { incidentId, periodDays } = input;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      const now = new Date();
      const monitoringDueAt = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

      // Determine status based on period
      let monitoringStatus: 'monitoring_30_day' | 'monitoring_60_day' | 'monitoring_90_day';
      if (periodDays <= 30) {
        monitoringStatus = 'monitoring_30_day';
      } else if (periodDays <= 60) {
        monitoringStatus = 'monitoring_60_day';
      } else {
        monitoringStatus = 'monitoring_90_day';
      }

      // Update incident
      const { error: updateError } = await supabase
        .from('incidents')
        .update({
          status: monitoringStatus,
          monitoring_period_days: periodDays,
          monitoring_started_at: now.toISOString(),
          monitoring_due_at: monitoringDueAt.toISOString(),
        })
        .eq('id', incidentId);

      if (updateError) throw updateError;

      // Create monitoring check schedule
      const checkInterval = periodDays <= 30 ? 15 : periodDays <= 60 ? 14 : 7;
      const checks: Array<{
        incident_id: string;
        tenant_id: string;
        scheduled_date: string;
        check_type: string;
        status: string;
        recurrence_found: boolean;
      }> = [];
      let checkDate = new Date(now.getTime() + checkInterval * 24 * 60 * 60 * 1000);

      while (checkDate <= monitoringDueAt) {
        checks.push({
          incident_id: incidentId,
          tenant_id: profile.tenant_id,
          scheduled_date: checkDate.toISOString().split('T')[0],
          check_type: 'periodic',
          status: 'pending',
          recurrence_found: false,
        });
        checkDate = new Date(checkDate.getTime() + checkInterval * 24 * 60 * 60 * 1000);
      }

      // Add final check at due date
      checks.push({
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        scheduled_date: monitoringDueAt.toISOString().split('T')[0],
        check_type: 'final',
        status: 'pending',
        recurrence_found: false,
      });

      if (checks.length > 0) {
        const { error: insertError } = await supabase
          .from('monitoring_check_schedule')
          .insert(checks);

        if (insertError) throw insertError;
      }

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        actor_id: user?.id,
        action: 'monitoring_started',
        details: { periodDays, checksScheduled: checks.length },
      });

      return { incidentId, periodDays, checksScheduled: checks.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      queryClient.invalidateQueries({ queryKey: ['monitoring-checks'] });

      toast({
        title: 'Monitoring Period Started',
        description: `${data.periodDays}-day monitoring period started with ${data.checksScheduled} scheduled checks.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCompleteMonitoringCheck() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CompleteMonitoringCheckInput) => {
      const { checkId, findings, recurrenceFound } = input;

      const { error } = await supabase
        .from('monitoring_check_schedule')
        .update({
          completed_at: new Date().toISOString(),
          completed_by: user?.id,
          status: 'completed',
          findings,
          recurrence_found: recurrenceFound,
        })
        .eq('id', checkId);

      if (error) throw error;

      // Get the check to find incident
      const { data: check } = await supabase
        .from('monitoring_check_schedule')
        .select('incident_id, tenant_id')
        .eq('id', checkId)
        .single();

      if (check && recurrenceFound) {
        // Update incident to flag recurrence
        await supabase
          .from('incidents')
          .update({ recurrence_detected: true })
          .eq('id', check.incident_id);

        // Log audit
        await supabase.from('incident_audit_logs').insert({
          incident_id: check.incident_id,
          tenant_id: check.tenant_id,
          actor_id: user?.id,
          action: 'recurrence_detected',
          details: { findings },
        });
      }

      return { checkId, recurrenceFound };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['monitoring-checks'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });

      toast({
        title: 'Monitoring Check Completed',
        description: data.recurrenceFound 
          ? 'Recurrence detected! Please review and take action.'
          : 'Check completed successfully.',
        variant: data.recurrenceFound ? 'destructive' : 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
