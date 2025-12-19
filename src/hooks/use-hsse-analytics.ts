import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ComplianceMetrics {
  total_mandatory_notifications: number;
  total_informational_notifications: number;
  overall_ack_rate: number;
  avg_response_time_hours: number;
  overdue_count: number;
  critical_pending: number;
  high_pending: number;
  weekly_trend: Array<{
    week_start: string;
    total_sent: number;
    ack_rate: number;
  }>;
}

export interface BranchAcknowledgmentRate {
  branch_id: string;
  branch_name: string;
  total_notifications: number;
  total_expected_acks: number;
  total_actual_acks: number;
  acknowledgment_rate: number;
  avg_response_hours: number;
}

export interface ResponseTimeDistribution {
  priority: string;
  avg_hours: number;
  min_hours: number;
  max_hours: number;
  count: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
}

export function useHSSEComplianceMetrics() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['hsse-compliance-metrics', profile?.tenant_id],
    queryFn: async (): Promise<ComplianceMetrics | null> => {
      if (!profile?.tenant_id) return null;

      const { data, error } = await supabase.rpc('get_hsse_compliance_metrics', {
        p_tenant_id: profile.tenant_id,
      });

      if (error) {
        console.error('Error fetching compliance metrics:', error);
        throw error;
      }

      // The function returns a single row
      const row = Array.isArray(data) ? data[0] : data;
      return row as ComplianceMetrics;
    },
    enabled: !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useHSSEAcknowledgmentRates(dateFrom?: Date, dateTo?: Date) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['hsse-acknowledgment-rates', profile?.tenant_id, dateFrom, dateTo],
    queryFn: async (): Promise<BranchAcknowledgmentRate[]> => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase.rpc('get_hsse_acknowledgment_rates', {
        p_tenant_id: profile.tenant_id,
        p_date_from: dateFrom?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_date_to: dateTo?.toISOString() || new Date().toISOString(),
      });

      if (error) {
        console.error('Error fetching acknowledgment rates:', error);
        throw error;
      }

      return (data || []) as BranchAcknowledgmentRate[];
    },
    enabled: !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHSSEResponseTimeDistribution() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['hsse-response-time-distribution', profile?.tenant_id],
    queryFn: async (): Promise<ResponseTimeDistribution[]> => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase.rpc('get_hsse_response_time_distribution', {
        p_tenant_id: profile.tenant_id,
      });

      if (error) {
        console.error('Error fetching response time distribution:', error);
        throw error;
      }

      return (data || []) as ResponseTimeDistribution[];
    },
    enabled: !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useHSSECategoryDistribution() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['hsse-category-distribution', profile?.tenant_id],
    queryFn: async (): Promise<CategoryDistribution[]> => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase.rpc('get_hsse_category_distribution', {
        p_tenant_id: profile.tenant_id,
      });

      if (error) {
        console.error('Error fetching category distribution:', error);
        throw error;
      }

      return (data || []) as CategoryDistribution[];
    },
    enabled: !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000,
  });
}
