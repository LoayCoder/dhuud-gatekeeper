import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MaterialGatePass {
  id: string;
  reference_number: string;
  project_id: string | null;
  company_id: string | null;
  pass_type: string;
  material_description: string;
  quantity: string | null;
  vehicle_plate: string | null;
  driver_name: string | null;
  driver_mobile: string | null;
  pass_date: string;
  time_window_start: string | null;
  time_window_end: string | null;
  status: string;
  requested_by: string;
  pm_approved_by: string | null;
  pm_approved_at: string | null;
  pm_notes: string | null;
  safety_approved_by: string | null;
  safety_approved_at: string | null;
  safety_notes: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  guard_verified_by: string | null;
  guard_verified_at: string | null;
  entry_time: string | null;
  exit_time: string | null;
  created_at: string;
  is_internal_request: boolean;
  approval_from_id: string | null;
  project?: { project_name: string; company?: { company_name: string } } | null;
  company?: { company_name: string } | null;
  approval_from?: { full_name: string } | null;
  requester?: { full_name: string } | null;
}

export interface GatePassFilters {
  search?: string;
  projectId?: string;
  companyId?: string;
  status?: string;
  passDate?: string;
}

export interface GatePassItemInput {
  item_name: string;
  description?: string;
  quantity?: string;
  unit?: string;
}

export interface CreateGatePassData {
  project_id?: string; // Optional for internal users
  company_id?: string; // Optional for internal users
  pass_type: string;
  pm_approved_by?: string;
  approval_from_id?: string; // For internal requests - selected approver
  is_internal_request?: boolean;
  vehicle_plate?: string;
  driver_name?: string;
  driver_mobile?: string;
  pass_date: string;
  time_window_start?: string;
  time_window_end?: string;
  items: GatePassItemInput[];
  photos: File[];
}

export function useMaterialGatePasses(filters: GatePassFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["material-gate-passes", tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("material_gate_passes")
        .select(`
          id, reference_number, project_id, company_id, pass_type, material_description,
          quantity, vehicle_plate, driver_name, driver_mobile, pass_date,
          time_window_start, time_window_end, status, requested_by,
          pm_approved_by, pm_approved_at, pm_notes,
          safety_approved_by, safety_approved_at, safety_notes,
          rejected_by, rejected_at, rejection_reason,
          guard_verified_by, guard_verified_at, entry_time, exit_time, created_at,
          is_internal_request, approval_from_id,
          project:contractor_projects(project_name, company:contractor_companies(company_name)),
          company:contractor_companies(company_name),
          requester:profiles!requested_by(full_name)
        `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.projectId) {
        query = query.eq("project_id", filters.projectId);
      }
      if (filters.companyId) {
        query = query.eq("company_id", filters.companyId);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.passDate) {
        query = query.eq("pass_date", filters.passDate);
      }
      if (filters.search) {
        query = query.or(`reference_number.ilike.%${filters.search}%,material_description.ilike.%${filters.search}%,vehicle_plate.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MaterialGatePass[];
    },
    enabled: !!tenantId,
  });
}

export function usePendingGatePassApprovals() {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["pending-gate-pass-approvals", tenantId, user?.id],
    queryFn: async () => {
      if (!tenantId || !user?.id) return [];

      // Use RPC to get passes the user can approve
      const { data: approvalData, error: rpcError } = await supabase
        .rpc("get_user_pending_gate_passes", {
          p_user_id: user.id,
          p_tenant_id: tenantId,
        });

      if (rpcError) {
        console.error("RPC error:", rpcError);
        // Fallback to direct query if RPC fails
        return [];
      }

      // Get the IDs of passes user can approve
      const approvableIds = (approvalData || [])
        .filter((r: { can_approve: boolean }) => r.can_approve)
        .map((r: { gate_pass_id: string }) => r.gate_pass_id);

      if (approvableIds.length === 0) return [];

      // Fetch full pass data for approvable passes
      const { data: passes, error } = await supabase
        .from("material_gate_passes")
        .select(`
          id, reference_number, project_id, company_id, pass_type, material_description,
          quantity, vehicle_plate, driver_name, driver_mobile, pass_date,
          time_window_start, time_window_end, status, requested_by, created_at,
          is_internal_request, approval_from_id,
          project:contractor_projects(project_name, company:contractor_companies(company_name)),
          company:contractor_companies(company_name),
          requester:profiles!requested_by(full_name),
          approval_from:profiles!material_gate_passes_approval_from_id_fkey(full_name)
        `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .in("id", approvableIds)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (passes || []) as MaterialGatePass[];
    },
    enabled: !!tenantId && !!user?.id,
  });
}

export function useTodayApprovedPasses() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["today-approved-passes", tenantId, today],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("material_gate_passes")
        .select(`
          id, reference_number, project_id, company_id, pass_type, material_description,
          quantity, vehicle_plate, driver_name, driver_mobile, pass_date,
          time_window_start, time_window_end, status, guard_verified_by,
          guard_verified_at, entry_time, exit_time, created_at,
          project:contractor_projects(project_name, company:contractor_companies(company_name)),
          company:contractor_companies(company_name)
        `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .eq("pass_date", today)
        .eq("status", "approved")
        .order("time_window_start", { ascending: true });

      if (error) throw error;
      return (data || []) as MaterialGatePass[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateGatePass() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (data: CreateGatePassData) => {
      if (!tenantId || !user?.id) throw new Error("Not authenticated");

      // Pre-flight validation using RPC
      const { data: permissionCheck, error: permError } = await supabase.rpc("can_create_gate_pass", {
        p_user_id: user.id,
        p_is_internal_request: data.is_internal_request || false,
        p_company_id: data.company_id || null,
      });

      if (permError) throw permError;
      
      const permission = permissionCheck as { allowed: boolean; reason?: string };
      if (!permission.allowed) {
        throw new Error(permission.reason || "You do not have permission to create this gate pass");
      }

      // Generate reference number
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from("material_gate_passes")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId);
      
      const sequence = (count || 0) + 1;
      const reference_number = `GP-${year}-${String(sequence).padStart(5, "0")}`;

      // Create combined material description from items for backward compatibility
      const materialDescription = data.items
        .map((item) => {
          let desc = item.item_name;
          if (item.quantity) desc += ` (${item.quantity}${item.unit ? " " + item.unit : ""})`;
          if (item.description) desc += ` - ${item.description}`;
          return desc;
        })
        .join("; ");

      // Insert gate pass
      const { data: result, error } = await supabase
        .from("material_gate_passes")
        .insert({
          project_id: data.project_id || null,
          company_id: data.company_id || null,
          pass_type: data.pass_type,
          pm_approved_by: data.pm_approved_by || null,
          approval_from_id: data.approval_from_id || null,
          is_internal_request: data.is_internal_request || false,
          material_description: materialDescription,
          quantity: data.items.length > 1 ? `${data.items.length} items` : data.items[0]?.quantity || null,
          vehicle_plate: data.vehicle_plate || null,
          driver_name: data.driver_name || null,
          driver_mobile: data.driver_mobile || null,
          pass_date: data.pass_date,
          time_window_start: data.time_window_start || null,
          time_window_end: data.time_window_end || null,
          tenant_id: tenantId,
          requested_by: user.id,
          reference_number,
          // Set initial status based on request type
          status: data.is_internal_request ? "pending_dept_approval" : "pending_contractor_approval",
        })
        .select()
        .single();

      if (error) throw error;

      // Insert items
      if (data.items.length > 0) {
        const itemsToInsert = data.items.map((item) => ({
          gate_pass_id: result.id,
          item_name: item.item_name,
          description: item.description || null,
          quantity: item.quantity || null,
          unit: item.unit || null,
          tenant_id: tenantId,
        }));

        const { error: itemsError } = await supabase
          .from("gate_pass_items")
          .insert(itemsToInsert);

        if (itemsError) console.error("Items insert error:", itemsError);
      }

      // Upload photos
      if (data.photos.length > 0) {
        const photoRecords = [];

        for (const photo of data.photos) {
          const fileName = `${result.id}/${crypto.randomUUID()}-${photo.name}`;
          const { error: uploadError } = await supabase.storage
            .from("gate-pass-photos")
            .upload(fileName, photo);

          if (uploadError) {
            console.error("Photo upload error:", uploadError);
            continue;
          }

          photoRecords.push({
            gate_pass_id: result.id,
            storage_path: fileName,
            file_name: photo.name,
            file_size: photo.size,
            mime_type: photo.type,
            uploaded_by: user.id,
            tenant_id: tenantId,
          });
        }

        if (photoRecords.length > 0) {
          const { error: photosError } = await supabase
            .from("gate_pass_photos")
            .insert(photoRecords);

          if (photosError) console.error("Photos insert error:", photosError);
        }
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      toast.success("Gate pass created successfully");
      
      // Notify department representatives about the new gate pass
      if (data?.project_id && tenantId) {
        supabase.functions.invoke('notify-dept-rep-gate-pass', {
          body: {
            gate_pass_id: data.id,
            project_id: data.project_id,
            tenant_id: tenantId,
            reference_number: data.reference_number,
            material_description: data.material_description,
            requester_name: profile?.full_name || 'Unknown',
            pass_date: data.pass_date,
            event_type: 'gate_pass_created',
          },
        }).catch(err => console.error('Failed to notify dept reps:', err));
      }
    },
    onError: (error) => {
      toast.error(`Failed to create gate pass: ${error.message}`);
    },
  });
}

export function useApproveGatePass() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ passId, action, notes }: { passId: string; action: "approve" | "reject"; notes?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Use the unified RPC for approval/rejection
      const { data, error } = await supabase.rpc("approve_gate_pass_unified", {
        p_user_id: user.id,
        p_gate_pass_id: passId,
        p_action: action,
        p_notes: notes || null,
      });

      if (error) throw error;
      
      // RPC returns the new status as a string
      const newStatus = data as string;
      
      return { passId, newStatus };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-gate-pass-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["today-approved-passes"] });
      queryClient.invalidateQueries({ queryKey: ["my-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["gate-pass-details"] });
      
      if (result.newStatus === "rejected") {
        toast.success("Gate pass rejected");
      } else if (result.newStatus === "approved") {
        toast.success("Gate pass fully approved - QR generated");
      } else {
        toast.success("Approval recorded - forwarded to next stage");
      }
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });
}

export function useRejectGatePass() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ passId, reason }: { passId: string; reason: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("material_gate_passes")
        .update({
          rejected_by: user.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          status: "rejected",
        })
        .eq("id", passId);

      if (error) throw error;
      return { passId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-gate-pass-approvals"] });
      toast.success("Gate pass rejected");
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });
}

export function useVerifyGatePass() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ passId, action }: { passId: string; action: "entry" | "exit" }) => {
      if (!user?.id || !profile?.tenant_id) throw new Error("Not authenticated");

      // 1. Fetch pass details
      const { data: pass, error: fetchError } = await supabase
        .from("material_gate_passes")
        .select("*")
        .eq("id", passId)
        .single();

      if (fetchError || !pass) throw new Error("Gate pass not found");

      if (action === "entry") {
        // 2. Create Unified Entry Log
        // This triggers the DB function `sync_gate_entry_to_parent` to update the pass status
        const { error } = await supabase
          .from("gate_entry_logs")
          .insert({
            tenant_id: profile.tenant_id,
            guard_id: user.id,
            entry_type: "vehicle",
            person_name: pass.driver_name || "Driver",
            mobile_number: pass.driver_mobile,
            car_plate: pass.vehicle_plate,
            purpose: pass.material_description ? `Material Transport: ${pass.material_description.substring(0, 50)}...` : "Material Transport",
            entry_time: new Date().toISOString(),
            access_type: "entry",
            validation_status: "valid"
          } as any);

        if (error) throw error;

      } else {
        const now = new Date().toISOString();
        // 3. Record Exit on existing log - search by pass ID in notes or by matching criteria
        // Note: material_gate_pass_id column may not exist, so search by vehicle plate + active entry
        const { data: openLog } = await (supabase
          .from("gate_entry_logs")
          .select("id")
          .eq("car_plate", pass.vehicle_plate)
          .eq("entry_type", "vehicle")
          .is("exit_time", null)
          .order("entry_time", { ascending: false })
          .limit(1)
          .single() as any);

        if (openLog) {
          const { error } = await supabase
            .from("gate_entry_logs")
            .update({ exit_time: now })
            .eq("id", openLog.id);

          if (error) throw error;
        } else {
          // Fallback for legacy passes without logs
          console.warn("No unified log found for pass exit. Updating legacy table directly.");
          const { error } = await supabase
            .from("material_gate_passes")
            .update({
              exit_time: now,
              guard_verified_by: user.id,
              guard_verified_at: now,
              status: 'completed'
            })
            .eq("id", passId);
          if (error) throw error;
        }
      }

      return { passId, action };
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["today-approved-passes"] });
      queryClient.invalidateQueries({ queryKey: ["unified-access-logs"] });
      queryClient.invalidateQueries({ queryKey: ["unified-access-stats"] });
      toast.success(action === "entry" ? "Entry recorded in Unified Log" : "Exit recorded");
    },
    onError: (error) => {
      toast.error(`Failed to verify: ${error.message}`);
    },
  });
}

interface BulkApproveParams {
  passIds: string[];
  approvalType: "pm" | "safety";
  notes?: string;
}

interface BulkRejectParams {
  passIds: string[];
  reason: string;
}

interface BulkResult {
  success: number;
  failed: number;
  errors: { passId: string; error: string }[];
}

export function useBulkApproveGatePasses() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ passIds, approvalType, notes }: BulkApproveParams): Promise<BulkResult> => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const results: BulkResult = { success: 0, failed: 0, errors: [] };
      const now = new Date().toISOString();

      for (const passId of passIds) {
        try {
          // Fetch the gate pass details for validation
          const { data: pass, error: fetchError } = await supabase
            .from("material_gate_passes")
            .select("requested_by, is_internal_request, approval_from_id, status")
            .eq("id", passId)
            .single();

          if (fetchError || !pass) {
            results.failed++;
            results.errors.push({ passId, error: "Gate pass not found" });
            continue;
          }

          // PREVENT SELF-APPROVAL
          if (pass.requested_by === user.id) {
            results.failed++;
            results.errors.push({ passId, error: "Cannot approve own request" });
            continue;
          }

          let updateData: Record<string, unknown> = {};

          if (approvalType === "pm") {
            updateData = {
              pm_approved_by: user.id,
              pm_approved_at: now,
              pm_notes: notes || null,
              status: "pending_safety_approval",
            };
          } else {
            // Safety approval - generate QR token
            const qrToken = crypto.randomUUID();
            updateData = {
              safety_approved_by: user.id,
              safety_approved_at: now,
              safety_notes: notes || null,
              status: "approved",
              qr_code_token: qrToken,
              qr_generated_at: now,
            };
          }

          const { error: updateError } = await supabase
            .from("material_gate_passes")
            .update(updateData)
            .eq("id", passId);

          if (updateError) {
            results.failed++;
            results.errors.push({ passId, error: updateError.message });
          } else {
            results.success++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push({ passId, error: error instanceof Error ? error.message : "Unknown error" });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-gate-pass-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["today-approved-passes"] });
      
      if (results.success > 0 && results.failed === 0) {
        toast.success(`${results.success} passes approved`);
      } else if (results.success > 0 && results.failed > 0) {
        toast.warning(`${results.success} approved, ${results.failed} failed`);
      }
    },
    onError: (error) => {
      toast.error(`Bulk approval failed: ${error.message}`);
    },
  });
}

export function useBulkRejectGatePasses() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ passIds, reason }: BulkRejectParams): Promise<BulkResult> => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const results: BulkResult = { success: 0, failed: 0, errors: [] };
      const now = new Date().toISOString();

      for (const passId of passIds) {
        try {
          const { error: updateError } = await supabase
            .from("material_gate_passes")
            .update({
              rejected_by: user.id,
              rejected_at: now,
              rejection_reason: reason,
              status: "rejected",
            })
            .eq("id", passId);

          if (updateError) {
            results.failed++;
            results.errors.push({ passId, error: updateError.message });
          } else {
            results.success++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push({ passId, error: error instanceof Error ? error.message : "Unknown error" });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-gate-pass-approvals"] });
      
      if (results.success > 0 && results.failed === 0) {
        toast.success(`${results.success} passes rejected`);
      } else if (results.success > 0 && results.failed > 0) {
        toast.warning(`${results.success} rejected, ${results.failed} failed`);
      }
    },
    onError: (error) => {
      toast.error(`Bulk rejection failed: ${error.message}`);
    },
  });
}
