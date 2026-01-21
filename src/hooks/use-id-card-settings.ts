import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { TenantIDCardSettings, IDCardType } from "@/types/id-card.types";

interface UseIDCardSettingsOptions {
  tenantId?: string;
  cardType?: IDCardType;
}

export function useIDCardSettings({ tenantId, cardType }: UseIDCardSettingsOptions = {}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['id-card-settings', tenantId, cardType],
    queryFn: async () => {
      let query = supabase
        .from('tenant_id_card_settings')
        .select('*')
        .is('deleted_at', null);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      if (cardType) {
        query = query.eq('card_type', cardType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TenantIDCardSettings[];
    },
    enabled: !!tenantId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (newSettings: Partial<TenantIDCardSettings> & { tenant_id: string; card_type: IDCardType }) => {
      const { data, error } = await supabase
        .from('tenant_id_card_settings')
        .upsert(
          {
            ...newSettings,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'tenant_id,card_type',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['id-card-settings'] });
      toast.success(t("idCard.settings.saved", "ID card settings saved"));
    },
    onError: (error) => {
      console.error('Failed to save ID card settings:', error);
      toast.error(t("idCard.settings.saveError", "Failed to save settings"));
    },
  });

  return {
    settings: cardType 
      ? settings?.find(s => s.card_type === cardType) 
      : settings,
    allSettings: settings,
    isLoading,
    error,
    saveSettings: upsertMutation.mutate,
    isSaving: upsertMutation.isPending,
  };
}

export function useIDCardSettingsByType(tenantId: string | undefined, cardType: IDCardType) {
  return useQuery({
    queryKey: ['id-card-settings', tenantId, cardType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_id_card_settings')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('card_type', cardType)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      
      // Return default settings if none found
      if (!data) {
        return getDefaultSettings(cardType);
      }
      
      return data as TenantIDCardSettings;
    },
    enabled: !!tenantId,
  });
}

// Helper to get default settings for a card type
function getDefaultSettings(cardType: IDCardType): Partial<TenantIDCardSettings> {
  const defaults: Partial<TenantIDCardSettings> = {
    card_type: cardType,
    front_bg_color: '#FFFFFF',
    front_accent_color: '#1e40af',
    front_text_color: '#1f2937',
    show_photo: true,
    show_qr_code: true,
    qr_position: 'right',
    front_fields: ['full_name', 'company', 'role', 'valid_until'],
    back_enabled: false,
    back_bg_color: '#f3f4f6',
    back_fields: ['emergency_contact', 'safety_instructions'],
    card_orientation: 'portrait',
    show_logo: true,
    logo_position: 'top-left',
    show_tenant_name: true,
    template_preset: 'standard',
    is_active: true,
  };

  // Apply card-type specific defaults
  switch (cardType) {
    case 'visitor':
      defaults.front_fields = ['full_name', 'company', 'destination', 'host_name', 'valid_until'];
      defaults.front_accent_color = '#3b82f6';
      defaults.back_enabled = true;
      break;
    case 'visitor_vip':
      defaults.front_fields = ['full_name', 'company', 'destination', 'valid_until'];
      defaults.front_accent_color = '#ca8a04';
      defaults.back_enabled = false;
      break;
    case 'worker':
      defaults.front_fields = ['full_name', 'company', 'role', 'project', 'valid_until'];
      defaults.front_accent_color = '#f97316';
      defaults.back_enabled = true;
      defaults.back_fields = ['safety_instructions', 'induction_status', 'emergency_contact'];
      break;
    case 'employee':
      defaults.front_fields = ['full_name', 'department', 'role', 'employee_id'];
      defaults.front_accent_color = '#1e40af';
      break;
    case 'contractor_rep':
      defaults.front_fields = ['full_name', 'company', 'role', 'valid_until'];
      defaults.front_accent_color = '#7c3aed';
      defaults.back_enabled = true;
      break;
  }

  return defaults;
}

export async function fetchIDCardSettings(tenantId: string, cardType: IDCardType): Promise<TenantIDCardSettings | null> {
  const { data, error } = await supabase
    .from('tenant_id_card_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('card_type', cardType)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    console.error('Error fetching ID card settings:', error);
    return null;
  }

  if (!data) {
    return getDefaultSettings(cardType) as TenantIDCardSettings;
  }

  return data as TenantIDCardSettings;
}

// Hook for duplicating settings from one card type to another
interface DuplicateSettingsParams {
  tenantId: string;
  sourceCardType: IDCardType;
  targetCardType: IDCardType;
  includeFields: boolean;
  includeColors: boolean;
  includeBackSettings: boolean;
  includeBranding: boolean;
}

export function useDuplicateIDCardSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      tenantId,
      sourceCardType,
      targetCardType,
      includeFields,
      includeColors,
      includeBackSettings,
      includeBranding,
    }: DuplicateSettingsParams) => {
      // 1. Fetch source settings
      const sourceSettings = await fetchIDCardSettings(tenantId, sourceCardType);
      
      if (!sourceSettings) {
        throw new Error('Source settings not found');
      }

      // 2. Build new settings for target
      const newSettings: Partial<TenantIDCardSettings> & { tenant_id: string; card_type: IDCardType } = {
        tenant_id: tenantId,
        card_type: targetCardType,
        // Always copy these layout settings
        card_orientation: sourceSettings.card_orientation,
        template_preset: sourceSettings.template_preset,
      };

      if (includeColors) {
        newSettings.front_bg_color = sourceSettings.front_bg_color;
        newSettings.front_accent_color = sourceSettings.front_accent_color;
        newSettings.front_text_color = sourceSettings.front_text_color;
      }

      if (includeFields) {
        newSettings.front_fields = sourceSettings.front_fields;
        newSettings.show_photo = sourceSettings.show_photo;
        newSettings.show_qr_code = sourceSettings.show_qr_code;
        newSettings.qr_position = sourceSettings.qr_position;
      }

      if (includeBackSettings) {
        newSettings.back_enabled = sourceSettings.back_enabled;
        newSettings.back_bg_color = sourceSettings.back_bg_color;
        newSettings.back_fields = sourceSettings.back_fields;
        newSettings.back_custom_text = sourceSettings.back_custom_text;
        newSettings.back_custom_text_ar = sourceSettings.back_custom_text_ar;
      }

      if (includeBranding) {
        newSettings.show_logo = sourceSettings.show_logo;
        newSettings.logo_position = sourceSettings.logo_position;
        newSettings.show_tenant_name = sourceSettings.show_tenant_name;
      }

      // 3. Upsert to target
      const { data, error } = await supabase
        .from('tenant_id_card_settings')
        .upsert(
          {
            ...newSettings,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'tenant_id,card_type',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['id-card-settings'] });
      toast.success(t("idCard.settings.duplicated", "Settings duplicated successfully"));
    },
    onError: (error) => {
      console.error('Failed to duplicate settings:', error);
      toast.error(t("idCard.settings.duplicateError", "Failed to duplicate settings"));
    },
  });

  return {
    duplicateSettings: mutation.mutateAsync,
    isDuplicating: mutation.isPending,
  };
}
