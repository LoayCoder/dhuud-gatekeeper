import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface InductionVideo {
  id: string;
  tenant_id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  language: string;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  valid_for_days: number;
  is_active: boolean;
  site_id: string | null;
  created_at: string;
  created_by: string | null;
  site?: { name: string } | null;
  creator?: { full_name: string } | null;
}

export interface InductionVideoFilters {
  language?: string;
  siteId?: string;
  isActive?: boolean;
}

export function useInductionVideos(filters: InductionVideoFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["induction-videos", tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("induction_videos")
        .select(`
          id, tenant_id, title, title_ar, description, language, video_url,
          thumbnail_url, duration_seconds, valid_for_days, is_active, site_id,
          created_at, created_by,
          site:sites(name),
          creator:profiles!induction_videos_created_by_fkey(full_name)
        `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.language) query = query.eq("language", filters.language);
      if (filters.siteId) query = query.eq("site_id", filters.siteId);
      if (filters.isActive !== undefined) query = query.eq("is_active", filters.isActive);

      const { data, error } = await query;
      if (error) throw error;
      return data as InductionVideo[];
    },
    enabled: !!tenantId,
  });
}

export function useInductionVideo(videoId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["induction-video", videoId],
    queryFn: async () => {
      if (!videoId || !tenantId) return null;

      const { data, error } = await supabase
        .from("induction_videos")
        .select(`
          id, tenant_id, title, title_ar, description, language, video_url,
          thumbnail_url, duration_seconds, valid_for_days, is_active, site_id,
          created_at, created_by,
          site:sites(name),
          creator:profiles!induction_videos_created_by_fkey(full_name)
        `)
        .eq("id", videoId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

      if (error) throw error;
      return data as InductionVideo;
    },
    enabled: !!videoId && !!tenantId,
  });
}

export function useCreateInductionVideo() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<InductionVideo>) => {
      if (!profile?.tenant_id || !user?.id) throw new Error("No tenant");

      const { data: result, error } = await supabase
        .from("induction_videos")
        .insert({
          title: data.title!,
          title_ar: data.title_ar,
          description: data.description,
          language: data.language!,
          video_url: data.video_url!,
          thumbnail_url: data.thumbnail_url,
          duration_seconds: data.duration_seconds,
          valid_for_days: data.valid_for_days || 365,
          is_active: data.is_active ?? true,
          site_id: data.site_id,
          tenant_id: profile.tenant_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["induction-videos"] });
      toast.success("Induction video created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateInductionVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<InductionVideo> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("induction_videos")
        .update({
          title: data.title,
          title_ar: data.title_ar,
          description: data.description,
          language: data.language,
          video_url: data.video_url,
          thumbnail_url: data.thumbnail_url,
          duration_seconds: data.duration_seconds,
          valid_for_days: data.valid_for_days,
          is_active: data.is_active,
          site_id: data.site_id,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["induction-videos"] });
      toast.success("Induction video updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteInductionVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase
        .from("induction_videos")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", videoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["induction-videos"] });
      toast.success("Induction video deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
