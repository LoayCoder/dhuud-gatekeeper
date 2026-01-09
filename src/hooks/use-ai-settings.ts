import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { Json } from "@/integrations/supabase/types";

// Types for AI Settings
export interface ObservationAISettings {
  rewrite_rules: {
    enable_translation: boolean;
    target_language: string;
  };
  classification: {
    observation_types: string[];
    severity_levels: string[];
    enable_positive_negative: boolean;
  };
  tagging: {
    enabled: boolean;
    auto_apply: boolean;
  };
}

export interface IncidentAISettings {
  rewrite_rules: {
    enable_translation: boolean;
    rewrite_title: boolean;
    rewrite_description: boolean;
    target_language: string;
  };
  classification: {
    incident_types: string[];
    severity_levels: string[];
  };
  injury_extraction: {
    enabled: boolean;
    auto_fill_count: boolean;
    auto_fill_type: boolean;
  };
  damage_extraction: {
    enabled: boolean;
    auto_fill_category: boolean;
  };
  tagging: {
    enabled: boolean;
    auto_apply: boolean;
  };
}

export type AISettingType = "observation" | "incident" | "global";

export interface AISettingsRecord {
  id: string;
  tenant_id: string;
  setting_type: AISettingType;
  settings: ObservationAISettings | IncidentAISettings;
  created_at: string;
  updated_at: string;
}

// Default settings
export const DEFAULT_OBSERVATION_SETTINGS: ObservationAISettings = {
  rewrite_rules: {
    enable_translation: true,
    target_language: "en",
  },
  classification: {
    observation_types: ["unsafe_act", "unsafe_condition", "safe_act", "safe_condition"],
    severity_levels: ["level_1", "level_2", "level_3", "level_4", "level_5"],
    enable_positive_negative: true,
  },
  tagging: {
    enabled: true,
    auto_apply: true,
  },
};

export const DEFAULT_INCIDENT_SETTINGS: IncidentAISettings = {
  rewrite_rules: {
    enable_translation: true,
    rewrite_title: true,
    rewrite_description: true,
    target_language: "en",
  },
  classification: {
    incident_types: [
      "safety", "health", "processSafety", "environment", "security",
      "propertyAssetDamage", "roadTrafficVehicle", "qualityService",
      "communityThirdParty", "complianceRegulatory", "emergencyCrisis"
    ],
    severity_levels: ["level_1", "level_2", "level_3", "level_4", "level_5"],
  },
  injury_extraction: {
    enabled: true,
    auto_fill_count: true,
    auto_fill_type: true,
  },
  damage_extraction: {
    enabled: true,
    auto_fill_category: true,
  },
  tagging: {
    enabled: true,
    auto_apply: true,
  },
};

export function useAISettings(settingType: AISettingType) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const queryKey = ["ai-settings", settingType];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: settings, error } = await supabase
        .from("ai_settings")
        .select("id, tenant_id, setting_type, settings, created_at, updated_at")
        .eq("setting_type", settingType)
        .maybeSingle();

      if (error) throw error;

      // Return defaults if no settings exist
      if (!settings) {
        const defaults = settingType === "observation" 
          ? DEFAULT_OBSERVATION_SETTINGS 
          : DEFAULT_INCIDENT_SETTINGS;
        return { settings: defaults, id: null };
      }

      return {
        settings: settings.settings as unknown as ObservationAISettings | IncidentAISettings,
        id: settings.id,
      };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (newSettings: ObservationAISettings | IncidentAISettings) => {
      // Get current user's tenant_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.tenant_id) throw new Error("No tenant found");

      if (data?.id) {
        // Update existing
        const { error } = await supabase
          .from("ai_settings")
          .update({ settings: newSettings as unknown as Json })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("ai_settings")
          .insert({
            tenant_id: profile.tenant_id,
            setting_type: settingType,
            settings: newSettings as unknown as Json,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: t("common.success"),
        description: t("admin.ai.settingsSaved", "AI settings saved successfully"),
      });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    settings: data?.settings ?? (settingType === "observation" ? DEFAULT_OBSERVATION_SETTINGS : DEFAULT_INCIDENT_SETTINGS),
    isLoading,
    error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
