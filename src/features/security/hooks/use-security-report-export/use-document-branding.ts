/**
 * Document Branding Hook
 * Provides branding settings for exported security reports.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DocumentBrandingSettings {
  headerBgColor: string;
  headerTextColor: string;
  footerBgColor: string;
  footerTextColor: string;
  footerText?: string;
  watermarkText?: string | null;
  watermarkEnabled: boolean;
}

const DEFAULT_SETTINGS: DocumentBrandingSettings = {
  headerBgColor: '#ffffff',
  headerTextColor: '#1f2937',
  footerBgColor: '#f3f4f6',
  footerTextColor: '#6b7280',
  footerText: undefined,
  watermarkText: null,
  watermarkEnabled: false,
};

export function useDocumentBranding() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const { data: settings } = useQuery({
    queryKey: ['document-branding', tenantId],
    queryFn: async () => {
      if (!tenantId) return DEFAULT_SETTINGS;

      const { data } = await (supabase as any)
        .from('tenant_settings')
        .select('setting_value')
        .eq('tenant_id', tenantId)
        .eq('setting_key', 'document_branding')
        .maybeSingle();

      if (data?.setting_value) {
        return { ...DEFAULT_SETTINGS, ...data.setting_value } as DocumentBrandingSettings;
      }
      return DEFAULT_SETTINGS;
    },
    enabled: !!tenantId,
  });

  return { settings: settings || DEFAULT_SETTINGS };
}
