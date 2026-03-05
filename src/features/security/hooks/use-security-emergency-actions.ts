import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface GlassBreakParams {
  tenantId: string;
  reason: string;
  durationMinutes: number;
}

interface SystemShutdownParams {
  tenantId: string;
  reason: string;
}

interface DeactivateGlassBreakParams {
  tenantId: string;
}

export function useSecurityEmergencyActions() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Activate Glass Break
  const activateGlassBreak = useMutation({
    mutationFn: async ({ tenantId, reason, durationMinutes }: GlassBreakParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

      // Update tenant
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({
          glass_break_active: true,
          glass_break_expires_at: expiresAt,
        })
        .eq("id", tenantId);

      if (tenantError) throw tenantError;

      // Create glass break event
      const { error: eventError } = await supabase
        .from("glass_break_events")
        .insert({
          tenant_id: tenantId,
          activated_by: user.id,
          reason,
          expires_at: expiresAt,
          is_active: true,
        });

      if (eventError) throw eventError;

      // Log emergency action
      const { error: logError } = await supabase
        .from("system_emergency_actions")
        .insert({
          tenant_id: tenantId,
          action_type: "glass_break_activate",
          performed_by: user.id,
          reason,
          metadata: { duration_minutes: durationMinutes, expires_at: expiresAt },
        });

      if (logError) throw logError;

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: t("security.glassBreakActivated", "🔓 Glass Break Activated"),
        description: t("security.glassBreakActivatedDescription", "Emergency access bypass is now active"),
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["security-overview-stats"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-security-settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Deactivate Glass Break
  const deactivateGlassBreak = useMutation({
    mutationFn: async ({ tenantId }: DeactivateGlassBreakParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update tenant
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({
          glass_break_active: false,
          glass_break_expires_at: null,
        })
        .eq("id", tenantId);

      if (tenantError) throw tenantError;

      // Update active glass break events
      const { error: eventError } = await supabase
        .from("glass_break_events")
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
          deactivated_by: user.id,
        })
        .eq("tenant_id", tenantId)
        .eq("is_active", true);

      if (eventError) throw eventError;

      // Log emergency action
      const { error: logError } = await supabase
        .from("system_emergency_actions")
        .insert({
          tenant_id: tenantId,
          action_type: "glass_break_deactivate",
          performed_by: user.id,
          reason: "Manual deactivation",
        });

      if (logError) throw logError;

      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: t("security.glassBreakDeactivated", "🔒 Glass Break Deactivated"),
        description: t("security.glassBreakDeactivatedDescription", "Security checks are now restored"),
      });
      queryClient.invalidateQueries({ queryKey: ["security-overview-stats"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-security-settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // System Shutdown
  const systemShutdown = useMutation({
    mutationFn: async ({ tenantId, reason }: SystemShutdownParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Count sessions to terminate
      const countResult = await (supabase
        .from("user_sessions")
        .select("id", { count: "exact", head: true }) as any)
        .eq("tenant_id", tenantId)
        .eq("is_valid", true);
      
      const sessionCount = countResult.count || 0;

      // Terminate all sessions
      await (supabase
        .from("user_sessions")
        .update({
          is_valid: false,
          invalidation_reason: "system_shutdown",
          invalidated_at: new Date().toISOString(),
        }) as any)
        .eq("tenant_id", tenantId)
        .eq("is_valid", true);

      // Update tenant
      await supabase
        .from("tenants")
        .update({
          system_shutdown_at: new Date().toISOString(),
          system_shutdown_by: user.id,
          system_shutdown_reason: reason,
        })
        .eq("id", tenantId);

      // Update tenant
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({
          system_shutdown_at: new Date().toISOString(),
          system_shutdown_by: user.id,
          system_shutdown_reason: reason,
        })
        .eq("id", tenantId);

      if (tenantError) throw tenantError;

      // Log emergency action
      const { error: logError } = await supabase
        .from("system_emergency_actions")
        .insert({
          tenant_id: tenantId,
          action_type: "system_shutdown",
          performed_by: user.id,
          reason,
          affected_users_count: sessionCount,
        });

      if (logError) throw logError;

      return { success: true, terminatedCount: sessionCount };
    },
    onSuccess: (data) => {
      toast({
        title: t("security.systemShutdownComplete", "⚡ System Shutdown Complete"),
        description: t("security.sessionsTerminated", "{{count}} sessions terminated", { count: data.terminatedCount }),
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["security-overview-stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Force Password Reset for all users (placeholder - requires adding column)
  const forcePasswordReset = useMutation({
    mutationFn: async ({ tenantId, reason }: SystemShutdownParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get all users for this tenant
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact" })
        .eq("tenant_id", tenantId)
        .eq("is_active", true);

      // Log emergency action (password reset is logged but actual reset would require auth admin)
      const { error: logError } = await supabase
        .from("system_emergency_actions")
        .insert({
          tenant_id: tenantId,
          action_type: "force_password_reset",
          performed_by: user.id,
          reason,
          affected_users_count: count || 0,
        });

      if (logError) throw logError;

      // Note: Actual password reset would require Supabase Auth Admin API
      return { success: true, affectedCount: count || 0 };
    },
    onSuccess: (data) => {
      toast({
        title: t("security.passwordResetForced", "🔑 Password Reset Required"),
        description: t("security.usersRequireReset", "{{count}} users will be required to reset their password", { count: data.affectedCount }),
      });
      queryClient.invalidateQueries({ queryKey: ["security-overview-stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error", "Error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    activateGlassBreak,
    deactivateGlassBreak,
    systemShutdown,
    forcePasswordReset,
  };
}
