/**
 * Validate Visitor Access Hook
 * 
 * Gate validation for visitors.
 * VISITOR-ONLY - Separate from worker access validation.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export interface ValidateVisitorAccessParams {
  qr_token: string;
  site_id: string;
}

export interface VisitorAccessValidationResult {
  is_valid: boolean;
  visitor_name?: string;
  company_name?: string;
  is_blacklisted?: boolean;
  validation_errors?: string[];
}

export function useValidateVisitorAccess() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (params: ValidateVisitorAccessParams): Promise<VisitorAccessValidationResult> => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      // Use the existing validate_visitor_qr RPC or direct query
      const { data: visitor, error } = await supabase
        .from('visitors')
        .select('id, full_name, company_name, is_active')
        .eq('qr_code_token', params.qr_token)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;

      if (!visitor) {
        return { is_valid: false, validation_errors: ['Visitor not found'] };
      }

      if (!visitor.is_active) {
        return { is_valid: false, visitor_name: visitor.full_name, validation_errors: ['Visitor not active'] };
      }

      return {
        is_valid: true,
        visitor_name: visitor.full_name,
        company_name: visitor.company_name,
      };
    },
    onSuccess: (result) => {
      if (result.is_valid) {
        toast({ title: t('security.gate.accessGranted', 'Access Granted'), description: result.visitor_name });
      } else {
        toast({ title: t('security.gate.accessDenied', 'Access Denied'), variant: 'destructive' });
      }
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });
}

export function useIsVisitorBlacklisted(nationalId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['visitor-blacklist-check', nationalId],
    queryFn: async () => {
      if (!tenantId || !nationalId) return null;

      const { data, error } = await supabase
        .from('security_blacklist')
        .select('id, reason')
        .eq('tenant_id', tenantId)
        .eq('identifier', nationalId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !!nationalId,
  });
}
