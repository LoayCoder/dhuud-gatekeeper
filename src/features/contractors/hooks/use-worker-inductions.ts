import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface WorkerInduction {
  id: string;
  tenant_id: string;
  worker_id: string;
  video_id: string;
  project_id: string;
  status: string;
  sent_at: string | null;
  sent_via: string | null;
  viewed_at: string | null;
  acknowledged_at: string | null;
  acknowledgment_method: string | null;
  expires_at: string;
  whatsapp_message_id: string | null;
  created_at: string;
  worker?: { full_name: string; mobile_number: string; preferred_language: string } | null;
  video?: { title: string; language: string; valid_for_days: number } | null;
  project?: { project_name: string } | null;
}

export interface WorkerInductionFilters {
  workerId?: string;
  projectId?: string;
  status?: string;
  expiringSoon?: boolean;
}

export function useWorkerInductions(filters: WorkerInductionFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["worker-inductions", tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("worker_inductions")
        .select(`
          id, tenant_id, worker_id, video_id, project_id, status, sent_at,
          sent_via, viewed_at, acknowledged_at, acknowledgment_method,
          expires_at, whatsapp_message_id, created_at,
          worker:contractor_workers(full_name, mobile_number, preferred_language),
          video:induction_videos(title, language, valid_for_days),
          project:contractor_projects(project_name)
        `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.workerId) query = query.eq("worker_id", filters.workerId);
      if (filters.projectId) query = query.eq("project_id", filters.projectId);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.expiringSoon) {
        const soon = new Date();
        soon.setDate(soon.getDate() + 30);
        query = query.lte("expires_at", soon.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WorkerInduction[];
    },
    enabled: !!tenantId,
  });
}

export function useWorkerInductionStatus(workerId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["worker-induction-status", workerId],
    queryFn: async () => {
      if (!workerId || !tenantId) return null;

      const { data, error } = await supabase
        .from("worker_inductions")
        .select(`
          id, status, sent_at, viewed_at, acknowledged_at, expires_at,
          video:induction_videos(title, language)
        `)
        .eq("worker_id", workerId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!workerId && !!tenantId,
  });
}

export function useInductionComplianceStats() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["induction-compliance-stats", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const now = new Date().toISOString();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // Get all inductions
      const { data: inductions, error } = await supabase
        .from("worker_inductions")
        .select("id, status, expires_at, acknowledged_at")
        .eq("tenant_id", tenantId)
        .is("deleted_at", null);

      if (error) throw error;

      const total = inductions?.length || 0;
      const completed = inductions?.filter(i => i.status === "completed" || i.acknowledged_at).length || 0;
      const pending = inductions?.filter(i => i.status === "pending" || i.status === "sent").length || 0;
      const expired = inductions?.filter(i => new Date(i.expires_at) < new Date(now)).length || 0;
      const expiringSoon = inductions?.filter(i => {
        const expiryDate = new Date(i.expires_at);
        return expiryDate > new Date(now) && expiryDate <= thirtyDaysFromNow;
      }).length || 0;

      return {
        total,
        completed,
        pending,
        expired,
        expiringSoon,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    },
    enabled: !!tenantId,
  });
}

export function useSendInduction() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      workerId,
      videoId,
      projectId,
    }: {
      workerId: string;
      videoId: string;
      projectId: string;
    }) => {
      if (!profile?.tenant_id) throw new Error("No tenant");

      // Get video for valid_for_days
      const { data: video, error: videoError } = await supabase
        .from("induction_videos")
        .select("valid_for_days")
        .eq("id", videoId)
        .single();

      if (videoError) throw videoError;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (video.valid_for_days || 365));

      // Create induction record
      const { data: induction, error } = await supabase
        .from("worker_inductions")
        .insert({
          worker_id: workerId,
          video_id: videoId,
          project_id: projectId,
          tenant_id: profile.tenant_id,
          status: "pending",
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Call edge function to send via WhatsApp
      const { error: fnError } = await supabase.functions.invoke("send-induction-video", {
        body: {
          workerId,
          videoId,
          projectId,
          inductionId: induction.id,
        },
      });

      if (fnError) {
        console.error("Failed to send induction video:", fnError);
        // Don't throw - the record is created, just mark as pending
      }

      return induction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-inductions"] });
      queryClient.invalidateQueries({ queryKey: ["worker-induction-status"] });
      queryClient.invalidateQueries({ queryKey: ["induction-compliance-stats"] });
      toast.success("Induction video sent");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useResendInduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inductionId: string) => {
      const { data: induction, error } = await supabase
        .from("worker_inductions")
        .select("worker_id, video_id, project_id")
        .eq("id", inductionId)
        .single();

      if (error) throw error;

      // Call edge function to resend
      const { error: fnError } = await supabase.functions.invoke("send-induction-video", {
        body: {
          workerId: induction.worker_id,
          videoId: induction.video_id,
          projectId: induction.project_id,
          inductionId,
          isResend: true,
        },
      });

      if (fnError) throw fnError;

      // Update sent_at
      await supabase
        .from("worker_inductions")
        .update({ sent_at: new Date().toISOString(), status: "sent" })
        .eq("id", inductionId);

      return induction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-inductions"] });
      toast.success("Induction video resent");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
