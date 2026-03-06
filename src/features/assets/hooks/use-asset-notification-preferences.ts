import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface AssetNotificationPreferences {
  id?: string;
  user_id: string;
  tenant_id: string;
  
  warranty_expiry_email: boolean;
  warranty_expiry_whatsapp: boolean;
  warranty_expiry_days_before: number;
  
  maintenance_due_email: boolean;
  maintenance_due_whatsapp: boolean;
  maintenance_due_days_before: number;
  
  low_stock_email: boolean;
  low_stock_whatsapp: boolean;
  
  depreciation_email: boolean;
  depreciation_whatsapp: boolean;
  
  insurance_expiry_email: boolean;
  insurance_expiry_whatsapp: boolean;
  insurance_expiry_days_before: number;
}

/** Loose client for tables not yet in generated types */
interface LooseSupabaseResponse<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

type LooseQueryBuilder = {
  select: (query: string) => LooseQueryBuilder;
  insert: (row: Record<string, unknown>) => LooseQueryBuilder;
  update: (row: Record<string, unknown>) => LooseQueryBuilder;
  eq: (col: string, val: unknown) => LooseQueryBuilder;
  is: (col: string, val: unknown) => LooseQueryBuilder;
  maybeSingle: () => Promise<LooseSupabaseResponse<Record<string, unknown>>>;
  single: () => Promise<LooseSupabaseResponse<Record<string, unknown>>>;
};

const looseClient = supabase as unknown as {
  from: (table: string) => LooseQueryBuilder;
};

const DEFAULT_PREFS: Omit<AssetNotificationPreferences, 'id' | 'user_id' | 'tenant_id'> = {
  warranty_expiry_email: true,
  warranty_expiry_whatsapp: false,
  warranty_expiry_days_before: 30,
  maintenance_due_email: true,
  maintenance_due_whatsapp: false,
  maintenance_due_days_before: 7,
  low_stock_email: true,
  low_stock_whatsapp: false,
  depreciation_email: false,
  depreciation_whatsapp: false,
  insurance_expiry_email: true,
  insurance_expiry_whatsapp: false,
  insurance_expiry_days_before: 30,
};

export function useAssetNotificationPreferences() {
  const { user, profile } = useAuth();
  
  return useQuery({
    queryKey: ["asset-notification-preferences", user?.id],
    queryFn: async () => {
      if (!user?.id || !profile?.tenant_id) return null;
      
      const { data, error } = await looseClient
        .from("asset_notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();
      
      if (error) throw new Error(error.message);
      
      // Return defaults if no preferences exist
      if (!data) {
        return {
          user_id: user.id,
          tenant_id: profile.tenant_id,
          ...DEFAULT_PREFS,
        } as AssetNotificationPreferences;
      }
      
      return data as unknown as AssetNotificationPreferences;
    },
    enabled: !!user?.id && !!profile?.tenant_id,
  });
}

export function useSaveAssetNotificationPreferences() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  
  return useMutation({
    mutationFn: async (preferences: Partial<AssetNotificationPreferences>) => {
      if (!user?.id || !profile?.tenant_id) {
        throw new Error("User not authenticated");
      }
      
      // Check if preferences exist
      const { data: existing } = await looseClient
        .from("asset_notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();
      
      if (existing?.id) {
        // Update existing
        const { data, error } = await looseClient
          .from("asset_notification_preferences")
          .update(preferences as Record<string, unknown>)
          .eq("id", existing.id as string)
          .single();
        
        if (error) throw new Error(error.message);
        return data as unknown as AssetNotificationPreferences;
      } else {
        // Insert new
        const { data, error } = await looseClient
          .from("asset_notification_preferences")
          .insert({
            ...(preferences as Record<string, unknown>),
            user_id: user.id,
            tenant_id: profile.tenant_id,
          })
          .single();
        
        if (error) throw new Error(error.message);
        return data as unknown as AssetNotificationPreferences;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-notification-preferences"] });
      toast({
        title: t("common.success"),
        description: t("settings.notificationPreferencesSaved", "Notification preferences saved"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
