import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WorkerQRCode {
  id: string;
  worker_id: string;
  project_id: string;
  qr_token: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  project_name?: string;
}

export function useWorkerQRCode(workerId: string) {
  return useQuery({
    queryKey: ["worker-qr-code", workerId],
    queryFn: async () => {
      // Table uses valid_until and is_revoked
      const { data, error } = await supabase
        .from("worker_qr_codes")
        .select(`
          id, worker_id, project_id, qr_token, valid_until, is_revoked, created_at,
          project:contractor_projects(project_name)
        `)
        .eq("worker_id", workerId)
        .eq("is_revoked", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      
      // Map to interface
      return {
        id: data.id,
        worker_id: data.worker_id,
        project_id: data.project_id,
        qr_token: data.qr_token,
        expires_at: data.valid_until,
        is_active: !data.is_revoked,
        created_at: data.created_at,
        project_name: (data.project as { project_name: string } | null)?.project_name,
      } as WorkerQRCode;
    },
    enabled: !!workerId,
  });
}

export function useGenerateWorkerQR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workerId, projectId }: { workerId: string; projectId: string }) => {
      const { data, error } = await supabase.functions.invoke("generate-worker-qr", {
        body: { workerId, projectId },
      });

      // Handle edge function error response in body
      if (data?.error) {
        throw new Error(data.error);
      }

      if (error) {
        // Try to parse error message from edge function response
        const errorMessage = error.message || "Failed to generate QR code";
        throw new Error(errorMessage);
      }
      
      return data;
    },
    onSuccess: (_, { workerId }) => {
      queryClient.invalidateQueries({ queryKey: ["worker-qr-code", workerId] });
      toast.success("QR code generated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to generate QR code");
    },
  });
}

export function useRevokeWorkerQR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workerId, reason }: { workerId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke("revoke-worker-access", {
        body: { workerId, reason },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { workerId }) => {
      queryClient.invalidateQueries({ queryKey: ["worker-qr-code", workerId] });
      toast.success("QR code revoked");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useSendInductionVideo() {
  return useMutation({
    mutationFn: async ({ workerId, language }: { workerId: string; language: string }) => {
      const { data, error } = await supabase.functions.invoke("send-induction-video", {
        body: { workerId, language },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Induction video sent");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
