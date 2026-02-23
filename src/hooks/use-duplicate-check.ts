import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DuplicateResult {
  duplicate_id: string;
  duplicate_reference_id: string;
  duplicate_title: string;
  similarity_score: number;
}

export interface DuplicateCheckInput {
  tenantId: string;
  departmentId: string;
  title: string;
  occurredAt: string;
}

export function useDuplicateCheck() {
  return useMutation({
    mutationFn: async (input: DuplicateCheckInput): Promise<DuplicateResult[]> => {
      const { data, error } = await supabase.rpc('check_duplicate_incident', {
        p_tenant_id: input.tenantId,
        p_department_id: input.departmentId,
        p_title: input.title,
        p_occurred_at: input.occurredAt,
      });

      if (error) {
        console.error('[DuplicateCheck] RPC error:', error);
        throw error;
      }

      return (data as DuplicateResult[]) || [];
    },
  });
}
