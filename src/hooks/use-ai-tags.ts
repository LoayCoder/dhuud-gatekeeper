import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export type AITagType = "observation" | "incident";

export interface AITag {
  id: string;
  tenant_id: string;
  tag_type: AITagType;
  name: string;
  name_ar: string | null;
  color: string;
  keywords: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAITagInput {
  name: string;
  name_ar?: string;
  color?: string;
  keywords?: string[];
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateAITagInput extends Partial<CreateAITagInput> {
  id: string;
}

export function useAITags(tagType: AITagType) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const queryKey = ["ai-tags", tagType];

  const { data: tags = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_tags")
        .select("*")
        .eq("tag_type", tagType)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as AITag[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateAITagInput) => {
      // Get current user's tenant_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.tenant_id) throw new Error("No tenant found");

      const { data, error } = await supabase
        .from("ai_tags")
        .insert({
          tenant_id: profile.tenant_id,
          tag_type: tagType,
          name: input.name,
          name_ar: input.name_ar ?? null,
          color: input.color ?? "#6366f1",
          keywords: input.keywords ?? [],
          is_active: input.is_active ?? true,
          sort_order: input.sort_order ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AITag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: t("common.success"),
        description: t("admin.ai.tagCreated", "Tag created successfully"),
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

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateAITagInput) => {
      const { id, ...updates } = input;
      const { error } = await supabase
        .from("ai_tags")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: t("common.success"),
        description: t("admin.ai.tagUpdated", "Tag updated successfully"),
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from("ai_tags")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: t("common.success"),
        description: t("admin.ai.tagDeleted", "Tag deleted successfully"),
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

  // Get active tags only
  const activeTags = tags.filter(tag => tag.is_active);

  return {
    tags,
    activeTags,
    isLoading,
    error,
    createTag: createMutation.mutate,
    updateTag: updateMutation.mutate,
    deleteTag: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook to get all tags (both types) for AI analysis
export function useAllAITags() {
  const { data: observationTags = [], isLoading: loadingObs } = useQuery({
    queryKey: ["ai-tags", "observation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_tags")
        .select("*")
        .eq("tag_type", "observation")
        .eq("is_active", true)
        .is("deleted_at", null);
      if (error) throw error;
      return data as AITag[];
    },
  });

  const { data: incidentTags = [], isLoading: loadingInc } = useQuery({
    queryKey: ["ai-tags", "incident"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_tags")
        .select("*")
        .eq("tag_type", "incident")
        .eq("is_active", true)
        .is("deleted_at", null);
      if (error) throw error;
      return data as AITag[];
    },
  });

  return {
    observationTags,
    incidentTags,
    isLoading: loadingObs || loadingInc,
  };
}
