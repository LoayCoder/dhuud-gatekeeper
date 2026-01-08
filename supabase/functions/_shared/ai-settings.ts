import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

export interface AITag {
  id: string;
  name: string;
  name_ar: string | null;
  color: string;
  keywords: string[];
  is_active: boolean;
}

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
    incident_types: ["safety", "health", "environment", "security", "quality"],
    severity_levels: ["low", "medium", "high", "critical"],
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

/**
 * Create a Supabase client for fetching settings
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase configuration");
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Fetch AI settings for a tenant
 */
export async function fetchAISettings<T extends ObservationAISettings | IncidentAISettings>(
  tenantId: string,
  settingType: "observation" | "incident",
  defaultSettings: T
): Promise<T> {
  try {
    const supabase = createSupabaseAdminClient();
    
    const { data, error } = await supabase
      .from("ai_settings")
      .select("settings")
      .eq("tenant_id", tenantId)
      .eq("setting_type", settingType)
      .is("deleted_at", null)
      .maybeSingle();
    
    if (error) {
      console.error(`[ai-settings] Error fetching ${settingType} settings:`, error);
      return defaultSettings;
    }
    
    if (!data?.settings) {
      console.log(`[ai-settings] No ${settingType} settings found for tenant, using defaults`);
      return defaultSettings;
    }
    
    return data.settings as T;
  } catch (err) {
    console.error(`[ai-settings] Failed to fetch settings:`, err);
    return defaultSettings;
  }
}

/**
 * Fetch AI tags for a tenant
 */
export async function fetchAITags(
  tenantId: string,
  tagType: "observation" | "incident"
): Promise<AITag[]> {
  try {
    const supabase = createSupabaseAdminClient();
    
    const { data, error } = await supabase
      .from("ai_tags")
      .select("id, name, name_ar, color, keywords, is_active")
      .eq("tenant_id", tenantId)
      .eq("tag_type", tagType)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });
    
    if (error) {
      console.error(`[ai-settings] Error fetching ${tagType} tags:`, error);
      return [];
    }
    
    return (data || []) as AITag[];
  } catch (err) {
    console.error(`[ai-settings] Failed to fetch tags:`, err);
    return [];
  }
}

/**
 * Match tags based on keywords in description
 */
export function matchTagsByKeywords(description: string, tags: AITag[]): string[] {
  const lowerDesc = description.toLowerCase();
  const matchedTags: string[] = [];
  
  for (const tag of tags) {
    if (tag.keywords && tag.keywords.length > 0) {
      for (const keyword of tag.keywords) {
        if (lowerDesc.includes(keyword.toLowerCase())) {
          if (!matchedTags.includes(tag.name)) {
            matchedTags.push(tag.name);
          }
          break; // Move to next tag once matched
        }
      }
    }
  }
  
  return matchedTags;
}

/**
 * Get tenant ID from authorization header
 */
export async function getTenantFromAuth(req: Request): Promise<string | null> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return null;
    
    const token = authHeader.replace("Bearer ", "");
    const supabase = createSupabaseAdminClient();
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    
    // Get tenant from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    
    return profile?.tenant_id || null;
  } catch {
    return null;
  }
}
