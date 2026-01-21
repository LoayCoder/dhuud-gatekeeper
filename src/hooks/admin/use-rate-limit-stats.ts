import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface RateLimitStats {
  total_requests_24h: number;
  failed_requests_24h: number;
  blocked_requests_24h: number;
  active_blocks_temporary: number;
  active_blocks_permanent: number;
  whitelisted_ips: number;
  threats_detected_24h: number;
}

export interface BlockedIP {
  id: string;
  ip_address: string;
  block_type: 'temporary' | 'permanent';
  reason: string;
  blocked_at: string;
  expires_at: string | null;
  failed_attempts: number;
  tenant_id: string | null;
  blocked_by: string | null;
  last_attempt_at: string | null;
}

export interface WhitelistedIP {
  id: string;
  ip_address: string;
  reason: string;
  added_by: string | null;
  tenant_id: string | null;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
}

export interface SuspiciousActivity {
  id: string;
  ip_address: string;
  activity_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  tenant_id: string | null;
  detected_at: string;
  action_taken: string | null;
}

export function useRateLimitStats() {
  return useQuery({
    queryKey: ['rate-limit-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_rate_limit_stats');
      if (error) throw error;
      return data as unknown as RateLimitStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useBlockedIPs() {
  return useQuery({
    queryKey: ['blocked-ips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ip_blocklist')
        .select('*')
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('blocked_at', { ascending: false });
      
      if (error) throw error;
      return data as BlockedIP[];
    },
  });
}

export function useWhitelistedIPs() {
  return useQuery({
    queryKey: ['whitelisted-ips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ip_whitelist')
        .select('*')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WhitelistedIP[];
    },
  });
}

export function useSuspiciousActivity(limit = 50) {
  return useQuery({
    queryKey: ['suspicious-activity', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suspicious_activity_log')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as SuspiciousActivity[];
    },
  });
}

export function useBlockIP() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      ip_address,
      block_type,
      reason,
      duration_hours,
      tenant_id,
    }: {
      ip_address: string;
      block_type: 'temporary' | 'permanent';
      reason: string;
      duration_hours?: number;
      tenant_id?: string;
    }) => {
      const { data, error } = await supabase.rpc('admin_block_ip', {
        _ip_address: ip_address,
        _block_type: block_type,
        _reason: reason,
        _duration_hours: duration_hours ?? null,
        _tenant_id: tenant_id ?? null,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
      queryClient.invalidateQueries({ queryKey: ['rate-limit-stats'] });
      queryClient.invalidateQueries({ queryKey: ['suspicious-activity'] });
      toast({
        title: 'IP Blocked',
        description: 'The IP address has been added to the blocklist.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to block IP',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUnblockIP() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ip_address: string) => {
      const { data, error } = await supabase.rpc('admin_unblock_ip', {
        _ip_address: ip_address,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
      queryClient.invalidateQueries({ queryKey: ['rate-limit-stats'] });
      toast({
        title: 'IP Unblocked',
        description: 'The IP address has been removed from the blocklist.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to unblock IP',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useWhitelistIP() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      ip_address,
      reason,
      duration_hours,
      tenant_id,
    }: {
      ip_address: string;
      reason: string;
      duration_hours?: number;
      tenant_id?: string;
    }) => {
      const { data, error } = await supabase.rpc('admin_whitelist_ip', {
        _ip_address: ip_address,
        _reason: reason,
        _duration_hours: duration_hours ?? null,
        _tenant_id: tenant_id ?? null,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelisted-ips'] });
      queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
      queryClient.invalidateQueries({ queryKey: ['rate-limit-stats'] });
      queryClient.invalidateQueries({ queryKey: ['suspicious-activity'] });
      toast({
        title: 'IP Whitelisted',
        description: 'The IP address has been added to the whitelist.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to whitelist IP',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveFromWhitelist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ip_whitelist')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelisted-ips'] });
      queryClient.invalidateQueries({ queryKey: ['rate-limit-stats'] });
      toast({
        title: 'Removed from Whitelist',
        description: 'The IP address has been removed from the whitelist.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove from whitelist',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Helper to mask IP address for display
export function maskIPAddress(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.**${parts[3].slice(-1)}`;
  }
  // For IPv6 or other formats, show first and last segments
  return ip.length > 10 ? `${ip.slice(0, 6)}...${ip.slice(-4)}` : ip;
}
