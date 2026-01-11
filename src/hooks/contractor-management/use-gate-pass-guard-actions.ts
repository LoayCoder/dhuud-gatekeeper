import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/use-user-roles";
import { toast } from "sonner";

export interface GuardGateActionResult {
  success: boolean;
  action: 'entry' | 'exit';
  timestamp: string;
  passReference: string;
  denialReason?: string;
}

interface GateActionAuditData {
  action: 'gate_pass_entry' | 'gate_pass_exit' | 'gate_pass_denied';
  passId: string;
  passReference: string;
  result: 'success' | 'denied';
  reason?: string;
  validationMethod: 'qr_scan' | 'manual_entry';
  metadata?: Record<string, unknown>;
}

/**
 * Log gate action to security audit logs
 */
async function logGateAudit(
  data: GateActionAuditData,
  tenantId: string,
  userId: string,
  userName: string | null
): Promise<void> {
  try {
    await supabase.from('security_audit_logs').insert({
      tenant_id: tenantId,
      actor_id: userId,
      actor_name: userName,
      action: data.action,
      action_category: 'gate_control',
      entity_type: 'material_gate_pass',
      entity_id: data.passId,
      entity_identifier: data.passReference,
      result: data.result,
      result_reason: data.reason,
      metadata: {
        validation_method: data.validationMethod,
        ...data.metadata,
      },
    });
  } catch (error) {
    console.error('Failed to log gate audit:', error);
  }
}

/**
 * Hook for security guards to record gate entry/exit.
 * ONLY security_guard role can use this.
 * Actions are triggered automatically after scan validation.
 */
export function useGuardGateAction() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { hasRole } = useUserRoles();

  const isGuard = hasRole('security_guard');
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async ({
      passId,
      passReference,
      action,
      validationMethod,
      metadata,
    }: {
      passId: string;
      passReference: string;
      action: 'entry' | 'exit';
      validationMethod: 'qr_scan' | 'manual_entry';
      metadata?: Record<string, unknown>;
    }): Promise<GuardGateActionResult> => {
      if (!user?.id || !tenantId) {
        throw new Error("Not authenticated");
      }

      // ROLE CHECK: Only security guards can record entry/exit
      if (!isGuard) {
        await logGateAudit(
          {
            action: 'gate_pass_denied',
            passId,
            passReference,
            result: 'denied',
            reason: 'Unauthorized role - not a security guard',
            validationMethod,
            metadata,
          },
          tenantId,
          user.id,
          profile?.full_name || null
        );
        throw new Error("Access denied: Only security guards can record entry/exit");
      }

      const now = new Date().toISOString();
      const updateData: Record<string, unknown> = {
        guard_verified_by: user.id,
        guard_verified_at: now,
      };

      if (action === 'entry') {
        updateData.entry_time = now;
      } else {
        updateData.exit_time = now;
        updateData.status = 'completed';
      }

      const { error } = await supabase
        .from('material_gate_passes')
        .update(updateData)
        .eq('id', passId);

      if (error) {
        await logGateAudit(
          {
            action: `gate_pass_${action}` as 'gate_pass_entry' | 'gate_pass_exit',
            passId,
            passReference,
            result: 'denied',
            reason: error.message,
            validationMethod,
            metadata,
          },
          tenantId,
          user.id,
          profile?.full_name || null
        );
        throw error;
      }

      // Log successful action
      await logGateAudit(
        {
          action: `gate_pass_${action}` as 'gate_pass_entry' | 'gate_pass_exit',
          passId,
          passReference,
          result: 'success',
          validationMethod,
          metadata,
        },
        tenantId,
        user.id,
        profile?.full_name || null
      );

      return {
        success: true,
        action,
        timestamp: now,
        passReference,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['material-gate-passes'] });
      queryClient.invalidateQueries({ queryKey: ['today-approved-passes'] });
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
      
      if (result.action === 'entry') {
        toast.success('Entry recorded automatically');
      } else {
        toast.success('Exit recorded - Pass completed');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook to verify a gate pass by reference number (manual entry fallback).
 * Returns pass data for automatic action processing.
 */
export function useVerifyPassByReference() {
  const { profile } = useAuth();
  const { hasRole } = useUserRoles();
  const tenantId = profile?.tenant_id;
  const isGuard = hasRole('security_guard');

  return useMutation({
    mutationFn: async (referenceNumber: string) => {
      if (!tenantId) throw new Error("Not authenticated");
      if (!isGuard) throw new Error("Access denied: Only security guards can verify passes");

      const normalizedRef = referenceNumber.trim().toUpperCase();
      const today = new Date().toISOString().split('T')[0];

      const { data: pass, error } = await supabase
        .from('material_gate_passes')
        .select(`
          id, reference_number, pass_type, pass_date, time_window_start, time_window_end,
          material_description, quantity, vehicle_plate, driver_name, driver_mobile,
          status, entry_time, exit_time, pm_approved_at, safety_approved_at,
          project:contractor_projects(project_name, company:contractor_companies(company_name))
        `)
        .eq('tenant_id', tenantId)
        .ilike('reference_number', normalizedRef)
        .is('deleted_at', null)
        .single();

      if (error || !pass) {
        return {
          is_valid: false,
          errors: ['Gate pass not found with this reference number'],
          warnings: [],
        };
      }

      // Check if fully approved
      if (!pass.pm_approved_at || !pass.safety_approved_at) {
        return {
          is_valid: false,
          errors: ['Gate pass not yet fully approved'],
          warnings: [],
          pass: formatPassData(pass),
        };
      }

      // Check pass date
      if (pass.pass_date !== today) {
        return {
          is_valid: false,
          errors: [
            pass.pass_date < today
              ? 'Gate pass has expired'
              : 'Gate pass is for a future date',
          ],
          warnings: [],
          pass: formatPassData(pass),
        };
      }

      // Check time window
      const warnings: string[] = [];
      if (pass.time_window_start && pass.time_window_end) {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        if (currentTime < pass.time_window_start || currentTime > pass.time_window_end) {
          return {
            is_valid: false,
            errors: [`Gate pass valid only between ${pass.time_window_start} - ${pass.time_window_end}`],
            warnings: [],
            pass: formatPassData(pass),
          };
        }
      }

      // Check if already completed
      if (pass.entry_time && pass.exit_time) {
        return {
          is_valid: false,
          errors: ['Gate pass already completed'],
          warnings: [],
          pass: formatPassData(pass),
        };
      }

      return {
        is_valid: true,
        errors: [],
        warnings,
        pass: formatPassData(pass),
      };
    },
  });
}

function formatPassData(pass: any) {
  return {
    id: pass.id,
    reference_number: pass.reference_number,
    pass_type: pass.pass_type,
    material_description: pass.material_description,
    quantity: pass.quantity,
    vehicle_plate: pass.vehicle_plate,
    driver_name: pass.driver_name,
    driver_mobile: pass.driver_mobile,
    pass_date: pass.pass_date,
    time_window_start: pass.time_window_start,
    time_window_end: pass.time_window_end,
    status: pass.status,
    entry_time: pass.entry_time,
    exit_time: pass.exit_time,
    project_name: pass.project?.project_name || '',
    company_name: pass.project?.company?.company_name || '',
  };
}
