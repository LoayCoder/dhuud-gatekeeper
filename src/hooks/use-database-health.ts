import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TenantIsolationStatus {
  table_name: string;
  has_tenant_id: boolean;
  has_rls_enabled: boolean;
  total_rows: number;
  unique_tenants: number;
  is_properly_isolated: boolean;
  recommendation: string;
}

export interface OrphanedRecord {
  table_name: string;
  column_name: string;
  orphaned_count: number;
  sample_ids: string[] | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface DataIntegrityIssue {
  check_name: string;
  table_name: string;
  issue_count: number;
  severity: 'high' | 'medium' | 'warning' | 'low';
  description: string;
  sample_data: Record<string, unknown> | null;
}

export interface HealthSummary {
  category: string;
  status: 'healthy' | 'warning' | 'critical';
  issue_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  last_checked_at: string;
}

/**
 * Hook to fetch overall database health summary
 */
export function useDatabaseHealthSummary() {
  return useQuery({
    queryKey: ['database-health-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_database_health_summary');
      if (error) throw error;
      return data as HealthSummary[];
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch tenant isolation status for all tables
 */
export function useTenantIsolationStatus() {
  return useQuery({
    queryKey: ['tenant-isolation-status'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_tenant_isolation_status');
      if (error) throw error;
      return data as TenantIsolationStatus[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch orphaned records across the database
 */
export function useOrphanedRecords() {
  return useQuery({
    queryKey: ['orphaned-records'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('find_orphaned_records');
      if (error) throw error;
      return data as OrphanedRecord[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch data integrity issues
 */
export function useDataIntegrityIssues() {
  return useQuery({
    queryKey: ['data-integrity-issues'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_data_integrity');
      if (error) throw error;
      return data as DataIntegrityIssue[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
