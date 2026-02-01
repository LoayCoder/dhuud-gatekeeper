import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export interface ContractViolation {
  id: string;
  tenant_id: string;
  incident_id: string;
  contractor_id: string | null;
  violation_type: string;
  description: string | null;
  fine_amount: number | null;
  currency: string;
  status: 'draft' | 'pending_approval' | 'finalized' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  contractor?: { id: string; company_name: string } | null;
  approver?: { full_name: string } | null;
}

export function useContractViolations(incidentId: string | null) {
  return useQuery({
    queryKey: ['contract-violations', incidentId],
    queryFn: async () => {
      if (!incidentId) return [];

      const { data, error } = await supabase
        .from('contract_violations')
        .select(`
          *,
          contractor:contractor_companies(id, company_name),
          approver:profiles!contract_violations_approved_by_fkey(full_name)
        `)
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ContractViolation[];
    },
    enabled: !!incidentId,
  });
}

export function useCreateContractViolation() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (violation: Partial<ContractViolation>) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('contract_violations')
        .insert({
          incident_id: violation.incident_id!,
          violation_type: violation.violation_type!,
          tenant_id: profile.tenant_id,
          contractor_id: violation.contractor_id || null,
          description: violation.description || null,
          fine_amount: violation.fine_amount || null,
          currency: violation.currency || 'SAR',
          status: violation.status || 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contract-violations', variables.incident_id] });
      toast.success(t('governance.violation.created', 'Violation record created'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

export function useUpdateContractViolation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ContractViolation> }) => {
      const { data, error } = await supabase
        .from('contract_violations')
        .update({
          violation_type: updates.violation_type,
          description: updates.description,
          fine_amount: updates.fine_amount,
          currency: updates.currency,
          status: updates.status,
          contractor_id: updates.contractor_id,
          approved_by: updates.approved_by,
          approved_at: updates.approved_at,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contract-violations', data.incident_id] });
      toast.success(t('governance.violation.updated', 'Violation updated'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

export function useDeleteContractViolation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, incidentId }: { id: string; incidentId: string }) => {
      const { error } = await supabase
        .from('contract_violations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return incidentId;
    },
    onSuccess: (incidentId) => {
      queryClient.invalidateQueries({ queryKey: ['contract-violations', incidentId] });
      toast.success(t('governance.violation.deleted', 'Violation deleted'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}
