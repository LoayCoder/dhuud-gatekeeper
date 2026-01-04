/**
 * Escalation Alerts Hooks
 * 
 * Provides queries and mutations for managing system escalation alerts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface SystemAlert {
  id: string;
  tenant_id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string | null;
  related_contractor_id: string | null;
  related_incident_id: string | null;
  related_user_id: string | null;
  target_role: string | null;
  target_user_id: string | null;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  // Joined data
  contractor_company?: {
    id: string;
    company_name: string;
  } | null;
  incident?: {
    id: string;
    reference_id: string;
    title: string;
  } | null;
}

/**
 * Fetch open escalation alerts for the current user's role
 */
export function useEscalationAlerts(options?: { 
  alertType?: string;
  status?: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
}) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['escalation-alerts', profile?.tenant_id, options?.alertType, options?.status],
    queryFn: async () => {
      let query = supabase
        .from('system_alerts')
        .select(`
          id, tenant_id, alert_type, severity, title, description,
          related_contractor_id, related_incident_id, related_user_id,
          target_role, target_user_id, status,
          acknowledged_at, acknowledged_by,
          resolved_at, resolved_by, resolution_notes,
          metadata, created_at,
          contractor_company:contractor_companies!related_contractor_id(id, company_name),
          incident:incidents!related_incident_id(id, reference_id, title)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (options?.alertType) {
        query = query.eq('alert_type', options.alertType);
      }
      
      if (options?.status) {
        query = query.eq('status', options.status);
      } else {
        query = query.eq('status', 'open');
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as SystemAlert[];
    },
    enabled: !!profile?.tenant_id,
  });
}

/**
 * Get count of open alerts for badge display
 */
export function useOpenAlertCount() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['open-alert-count', profile?.tenant_id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('system_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open')
        .is('deleted_at', null);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile?.tenant_id,
    refetchInterval: 60000, // Refresh every minute
  });
}

/**
 * Acknowledge an alert
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('system_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id,
        })
        .eq('id', alertId);
      
      if (error) throw error;
      return { alertId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['open-alert-count'] });
      toast({
        title: "Alert Acknowledged",
        description: "The escalation alert has been acknowledged",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Resolve an alert
 */
export function useResolveAlert() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes?: string }) => {
      const { error } = await supabase
        .from('system_alerts')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          resolution_notes: notes,
        })
        .eq('id', alertId);
      
      if (error) throw error;
      return { alertId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['open-alert-count'] });
      toast({
        title: "Alert Resolved",
        description: "The escalation alert has been resolved",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Dismiss an alert (for non-actionable alerts)
 */
export function useDismissAlert() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ alertId, reason }: { alertId: string; reason?: string }) => {
      const { error } = await supabase
        .from('system_alerts')
        .update({
          status: 'dismissed',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          resolution_notes: reason,
        })
        .eq('id', alertId);
      
      if (error) throw error;
      return { alertId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalation-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['open-alert-count'] });
      toast({
        title: "Alert Dismissed",
        description: "The alert has been dismissed",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
