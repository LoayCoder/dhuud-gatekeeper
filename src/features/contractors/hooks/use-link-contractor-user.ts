import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface LinkUserParams {
  representativeId: string;
  userId: string;
  companyId: string;
}

export function useLinkContractorUser() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ representativeId, userId, companyId }: LinkUserParams) => {
      if (!profile?.tenant_id) throw new Error("No tenant");

      // Update contractor_representatives with user_id
      const { error: updateError } = await supabase
        .from("contractor_representatives")
        .update({ user_id: userId })
        .eq("id", representativeId);

      if (updateError) throw updateError;

      // Get contractor_site_rep role
      const { data: roleData } = await supabase
        .from("roles")
        .select("id")
        .eq("code", "contractor_site_rep")
        .single();

      if (roleData?.id) {
        // Check if user already has this role
        const { data: existingAssignment } = await supabase
          .from("user_role_assignments")
          .select("id")
          .eq("user_id", userId)
          .eq("role_id", roleData.id)
          .maybeSingle();

        // Assign role if not already assigned
        if (!existingAssignment) {
          const { error: roleError } = await supabase
            .from("user_role_assignments")
            .insert({
              user_id: userId,
              role_id: roleData.id,
              tenant_id: profile.tenant_id,
            });

          if (roleError) {
            console.error("Failed to assign role:", roleError);
            // Don't throw - role assignment is secondary
          }
        }
      }

      // Log the action
      try {
        await supabase.functions.invoke("contractor-audit-log", {
          body: {
            entity_type: "contractor_representative",
            entity_id: representativeId,
            action: "user_linked",
            old_value: { user_id: null },
            new_value: { user_id: userId, company_id: companyId },
            tenant_id: profile.tenant_id,
          },
        });
      } catch (e) {
        console.error("Failed to log audit event:", e);
      }

      return { representativeId, userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-representatives"] });
      queryClient.invalidateQueries({ queryKey: ["contractor-companies"] });
      queryClient.invalidateQueries({ queryKey: ["contractor-company-details"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUnlinkContractorUser() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (representativeId: string) => {
      if (!profile?.tenant_id) throw new Error("No tenant");

      // Get current user_id before unlinking
      const { data: rep } = await supabase
        .from("contractor_representatives")
        .select("user_id")
        .eq("id", representativeId)
        .single();

      const previousUserId = rep?.user_id;

      // Remove user_id from representative
      const { error } = await supabase
        .from("contractor_representatives")
        .update({ user_id: null })
        .eq("id", representativeId);

      if (error) throw error;

      // Log the action
      try {
        await supabase.functions.invoke("contractor-audit-log", {
          body: {
            entity_type: "contractor_representative",
            entity_id: representativeId,
            action: "user_unlinked",
            old_value: { user_id: previousUserId },
            new_value: { user_id: null },
            tenant_id: profile.tenant_id,
          },
        });
      } catch (e) {
        console.error("Failed to log audit event:", e);
      }

      return representativeId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-representatives"] });
      queryClient.invalidateQueries({ queryKey: ["contractor-companies"] });
      queryClient.invalidateQueries({ queryKey: ["contractor-company-details"] });
      toast.success("User unlinked from representative");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
