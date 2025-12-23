import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SecurityDashboardStats {
  active_sessions: number;
  users_with_sessions: number;
  sessions_invalidated_24h: number;
  suspicious_logins_7d: number;
  failed_logins_24h: number;
  scan_findings: {
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
    info?: number;
  };
  recent_events: Array<{
    action: string;
    created_at: string;
    actor_id: string;
    new_value: Record<string, unknown>;
  }>;
  mfa_enabled_users: number;
  total_users: number;
}

export interface SecurityScanResult {
  id: string;
  tenant_id: string;
  scan_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string | null;
  affected_resource: string | null;
  recommendation: string | null;
  status: 'open' | 'acknowledged' | 'resolved' | 'false_positive';
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  detected_at: string;
  last_seen_at: string;
  metadata: Record<string, unknown>;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  device_info: Record<string, unknown>;
  ip_address: string | null;
  ip_country: string | null;
  ip_city: string | null;
  user_agent: string | null;
  created_at: string;
  last_activity_at: string;
  expires_at: string | null;
  is_active: boolean;
  invalidated_at: string | null;
  invalidation_reason: string | null;
}

/**
 * Hook to fetch security dashboard statistics
 */
export function useSecurityDashboardStats() {
  return useQuery({
    queryKey: ['security-dashboard-stats'],
    queryFn: async (): Promise<SecurityDashboardStats> => {
      const { data, error } = await supabase.rpc('get_security_dashboard_stats');
      
      if (error) {
        console.error('Failed to fetch security stats:', error);
        throw error;
      }
      
      return data as unknown as SecurityDashboardStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000,
  });
}

/**
 * Hook to fetch security scan results
 */
export function useSecurityScanResults(status?: string) {
  return useQuery({
    queryKey: ['security-scan-results', status],
    queryFn: async (): Promise<SecurityScanResult[]> => {
      let query = supabase
        .from('security_scan_results')
        .select('*')
        .order('severity', { ascending: true })
        .order('detected_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Failed to fetch scan results:', error);
        throw error;
      }
      
      return data as SecurityScanResult[];
    },
    staleTime: 30000,
  });
}

/**
 * Hook to fetch active user sessions
 */
export function useActiveSessions() {
  return useQuery({
    queryKey: ['active-sessions'],
    queryFn: async (): Promise<UserSession[]> => {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false });
      
      if (error) {
        console.error('Failed to fetch sessions:', error);
        throw error;
      }
      
      return data as UserSession[];
    },
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 5000,
  });
}

/**
 * Hook to update security scan result status
 */
export function useUpdateScanResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      resolutionNotes 
    }: { 
      id: string; 
      status: string; 
      resolutionNotes?: string;
    }) => {
      const updates: Record<string, unknown> = { status };
      
      if (status === 'resolved') {
        const { data: { user } } = await supabase.auth.getUser();
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = user?.id;
      }
      
      if (resolutionNotes) {
        updates.resolution_notes = resolutionNotes;
      }
      
      const { error } = await supabase
        .from('security_scan_results')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-scan-results'] });
      queryClient.invalidateQueries({ queryKey: ['security-dashboard-stats'] });
    },
  });
}

/**
 * Hook to invalidate a user session (admin action)
 */
export function useInvalidateUserSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      reason 
    }: { 
      sessionId: string; 
      reason: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          invalidated_at: new Date().toISOString(),
          invalidation_reason: reason,
          invalidated_by: user?.id,
        })
        .eq('id', sessionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['security-dashboard-stats'] });
    },
  });
}

/**
 * Hook to fetch login history for security analysis
 */
export function useLoginHistory(limit: number = 50) {
  return useQuery({
    queryKey: ['login-history', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('login_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Failed to fetch login history:', error);
        throw error;
      }
      
      return data as Array<{
        id: string;
        user_id: string;
        login_successful?: boolean;
        is_suspicious?: boolean;
        ip_address?: string;
        country?: string;
        city?: string;
        device_type?: string;
        browser?: string;
        risk_score?: number;
        created_at: string;
      }>;
    },
    staleTime: 30000,
  });
}
