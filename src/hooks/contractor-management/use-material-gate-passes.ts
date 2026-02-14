import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { compressImage } from "@/lib/upload-utils";

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
  pass_date: string; // Pass validity date
  start_date?: string | null; // Start date (if date range is used)
  end_date?: string | null; // End date (if date range is used)
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
  // Renewal tracking (optional, added via migration)
  renewal_count?: number;
  renewed_by?: string | null;
  renewed_at?: string | null;
  renewal_expires_at?: string | null;
  project?: { project_name: string; company?: { company_name: string } } | null;
  company?: { company_name: string } | null;
  approval_from?: { full_name: string } | null;
  requester?: { full_name: string } | null;
  is_public_request?: boolean;
  public_requester_name?: string | null;
  public_requester_phone?: string | null;
  public_requester_email?: string | null;
  public_requester_company?: string | null;
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
  photos?: File[];  // Required photos array for item-level photos
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
  pass_date?: string; // Pass validity date
  start_date?: string; // Pass validity start date (future use)
  end_date?: string; // Pass validity end date (future use)
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
          quantity, vehicle_plate, driver_name, driver_mobile, pass_date, start_date, end_date,
          time_window_start, time_window_end, status, requested_by,
          pm_approved_by, pm_approved_at, pm_notes,
          safety_approved_by, safety_approved_at, safety_notes,
          rejected_by, rejected_at, rejection_reason,
          guard_verified_by, guard_verified_at, entry_time, exit_time, created_at,
          is_internal_request, approval_from_id,
          renewal_count, renewed_by, renewed_at, renewal_expires_at,
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

      // Step 1: Get user's roles
      const { data: userRoles } = await supabase
        .from("user_role_assignments")
        .select("roles(code)")
        .eq("user_id", user.id)
        .eq("tenant_id", tenantId);

      const roleCodes = (userRoles || [])
        .map((r: { roles: { code: string } | null }) => r.roles?.code)
        .filter(Boolean) as string[];

      // Step 2: Determine which statuses this user can approve based on their roles
      const allowedStatuses: string[] = [];

      // Security Supervisor/Manager -> pending_security_approval
      if (roleCodes.includes("security_supervisor") || roleCodes.includes("security_manager")) {
        allowedStatuses.push("pending_security_approval");
      }

      // Contractor Consultant -> pending_contractor_approval
      if (roleCodes.includes("contractor_consultant")) {
        allowedStatuses.push("pending_contractor_approval");
      }

      // Department Representative/Manager -> pending_dept_approval, pending_club_mgmt_ack
      if (roleCodes.includes("department_representative") || roleCodes.includes("department_manager")) {
        allowedStatuses.push("pending_dept_approval");
        allowedStatuses.push("pending_club_mgmt_ack");
        allowedStatuses.push("pending_dept_ack"); // Legacy status
      }

      // Admin can see all pending statuses
      if (roleCodes.includes("admin")) {
        allowedStatuses.push(
          "pending_dept_approval",
          "pending_contractor_approval",
          "pending_club_mgmt_ack",
          "pending_security_approval",
          "pending_dept_ack",
          "pending_pm_approval",
          "pending_safety_approval"
        );
      }

      // If user has no approval roles, return empty
      if (allowedStatuses.length === 0) {
        console.log("[GatePassApprovals] User has no approval roles:", { userId: user.id, roleCodes });
        return [];
      }

      // Deduplicate statuses
      const uniqueStatuses = [...new Set(allowedStatuses)];

      console.log("[GatePassApprovals] Role-based filtering:", {
        userId: user.id,
        roleCodes,
        allowedStatuses: uniqueStatuses
      });

      // Step 3: Fetch only passes the user can approve based on their role
      const { data: passes, error } = await supabase
        .from("material_gate_passes")
        .select(`
          id, reference_number, project_id, company_id, pass_type, material_description,
          quantity, vehicle_plate, driver_name, driver_mobile, pass_date,
          time_window_start, time_window_end, status, requested_by, created_at,
          is_internal_request, approval_from_id,
          is_public_request, public_requester_name, public_requester_phone,
          public_requester_email, public_requester_company,
          project:contractor_projects(project_name, company:contractor_companies(company_name)),
          company:contractor_companies(company_name),
          requester:profiles!requested_by(full_name),
          approval_from:profiles!material_gate_passes_approval_from_id_fkey(full_name)
        `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .in("status", uniqueStatuses)
        .or(`requested_by.neq.${user.id},requested_by.is.null`) // Exclude own requests but include public (NULL) submissions
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Step 4: Apply additional filtering for specific statuses
      const filteredPasses = (passes || []).filter((pass) => {
        const p = pass as unknown as MaterialGatePass;

        // For internal pending_dept_approval: only show if user is the designated approver
        if (p.is_internal_request && p.status === "pending_dept_approval") {
          return p.approval_from_id === user.id;
        }

        // For pending_club_mgmt_ack: server validates on approval, show all for now
        // For pending_security_approval: show all to security roles
        // For pending_contractor_approval: show all to contractor consultants
        return true;
      });

      console.log("[GatePassApprovals] Results:", {
        totalFetched: passes?.length || 0,
        afterFiltering: filteredPasses.length
      });

      return filteredPasses as unknown as MaterialGatePass[];
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

      // Include all active pass statuses: approved (ready), used (entry recorded), completed
      const activeStatuses = ["approved", "used", "completed"];

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
        .in("status", activeStatuses)
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
          // Use pass_date or start_date/end_date for pass validity
          start_date: data.start_date || data.pass_date || null,
          end_date: data.end_date || data.pass_date || null,
          pass_date: data.pass_date || data.start_date, // Keep legacy field in sync
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

      // Insert items and upload item photos
      if (data.items.length > 0) {
        const itemsToInsert = data.items.map((item) => ({
          gate_pass_id: result.id,
          item_name: item.item_name,
          description: item.description || null,
          quantity: item.quantity || null,
          unit: item.unit || null,
          tenant_id: tenantId,
        }));

        const { data: insertedItems, error: itemsError } = await supabase
          .from("gate_pass_items")
          .insert(itemsToInsert)
          .select("id");

        if (itemsError) {
          console.error("Items insert error:", itemsError);
        } else if (insertedItems) {
          // Upload item-level photos with compression
          for (let i = 0; i < data.items.length; i++) {
            const item = data.items[i];
            const insertedItem = insertedItems[i];

            if (item.photos && item.photos.length > 0 && insertedItem) {
              const photoRecords = [];

              for (const photo of item.photos) {
                // Compress image before upload (maxWidth: 1280, quality: 0.75)
                const compressedPhoto = await compressImage(photo, 1280, 0.75);

                const fileName = `${tenantId}/${result.id}/${insertedItem.id}/${crypto.randomUUID()}-${photo.name}`;
                const { error: uploadError } = await supabase.storage
                  .from("gate-pass-photos")
                  .upload(fileName, compressedPhoto);

                if (uploadError) {
                  console.error("Item photo upload error:", uploadError);
                  continue;
                }

                photoRecords.push({
                  item_id: insertedItem.id,
                  gate_pass_id: result.id,
                  storage_path: fileName,
                  file_name: photo.name,
                  file_size: compressedPhoto.size,
                  mime_type: compressedPhoto.type,
                  uploaded_by: user.id,
                  tenant_id: tenantId,
                });
              }

              if (photoRecords.length > 0) {
                const { error: photosError } = await supabase
                  .from("gate_pass_item_photos")
                  .insert(photoRecords);

                if (photosError) console.error("Item photos insert error:", photosError);
              }
            }
          }
        }
      }

      // Upload pass-level photos (legacy support)
      if (data.photos.length > 0) {
        const photoRecords = [];

        for (const photo of data.photos) {
          const compressedPhoto = await compressImage(photo, 1280, 0.75);
          const fileName = `${result.id}/${crypto.randomUUID()}-${photo.name}`;
          const { error: uploadError } = await supabase.storage
            .from("gate-pass-photos")
            .upload(fileName, compressedPhoto);

          if (uploadError) {
            console.error("Photo upload error:", uploadError);
            continue;
          }

          photoRecords.push({
            gate_pass_id: result.id,
            storage_path: fileName,
            file_name: photo.name,
            file_size: compressedPhoto.size,
            mime_type: compressedPhoto.type,
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

      // Get gate pass details first (needed for public notification)
      const { data: gatePass } = await supabase
        .from("material_gate_passes")
        .select(`
          id, is_public_request, public_requester_name, public_requester_phone,
          public_requester_email, public_requester_company, material_description,
          pass_date, reference_number, public_access_token, tenant_id, branch_id,
          tenants(slug)
        `)
        .eq("id", passId)
        .single();

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

      // Trigger notification for public gate passes
      if (gatePass?.is_public_request && (newStatus === "approved" || newStatus === "rejected" || newStatus === "pending_security_approval")) {
        const tenantSlug = (gatePass.tenants as { slug: string } | null)?.slug || "";
        const eventType = newStatus === "approved" ? "approved" :
          newStatus === "rejected" ? "rejected" :
            "acknowledged";

        try {
          console.log(`[Gate Pass] Triggering ${eventType} notification for public gate pass:`, gatePass.reference_number);
          await supabase.functions.invoke("notify-public-gate-pass", {
            body: {
              gate_pass_id: gatePass.id,
              tenant_id: gatePass.tenant_id,
              branch_id: gatePass.branch_id,
              reference_number: gatePass.reference_number,
              requester_name: gatePass.public_requester_name,
              requester_phone: gatePass.public_requester_phone,
              requester_email: gatePass.public_requester_email,
              requester_company: gatePass.public_requester_company,
              material_description: gatePass.material_description,
              pass_date: gatePass.pass_date,
              tracking_url: `/${tenantSlug}/track/${gatePass.public_access_token}`,
              public_access_token: gatePass.public_access_token,
              event_type: eventType,
              rejection_reason: action === "reject" ? notes : null,
            },
          });
          console.log(`[Gate Pass] ${eventType} notification sent successfully`);
        } catch (notifyError) {
          console.error("[Gate Pass] Failed to send notification:", notifyError);
          // Don't fail the approval - notification is best-effort
        }
      }

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

      // Use unified RPC for rejection - ensures proper audit logging and validation
      const { data, error } = await supabase.rpc("approve_gate_pass_unified", {
        p_user_id: user.id,
        p_gate_pass_id: passId,
        p_action: "reject",
        p_notes: reason,
      });

      if (error) throw error;
      return { passId, newStatus: data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["pending-gate-pass-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["my-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["gate-pass-details"] });
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
        .select("id, vehicle_plate, driver_name, driver_mobile, material_description, reference_number, status")
        .eq("id", passId)
        .single();

      if (fetchError || !pass) throw new Error("Gate pass not found");

      // Validate pass status before action
      if (action === "entry" && pass.status !== "approved") {
        throw new Error(`Cannot record entry: pass status is ${pass.status}, expected 'approved'`);
      }
      if (action === "exit" && pass.status !== "used") {
        throw new Error(`Cannot record exit: pass status is ${pass.status}, expected 'used'`);
      }

      const now = new Date().toISOString();

      if (action === "entry") {
        // Create Unified Entry Log with FK link to material_gate_passes
        // The DB trigger `sync_gate_entry_to_parent` will automatically update pass status to 'used'
        const { error } = await supabase
          .from("gate_entry_logs")
          .insert({
            tenant_id: profile.tenant_id,
            guard_id: user.id,
            entry_type: "vehicle",
            person_name: pass.driver_name || "Driver",
            mobile_number: pass.driver_mobile,
            car_plate: pass.vehicle_plate,
            purpose: pass.material_description
              ? `Material: ${pass.material_description.substring(0, 50)}${pass.material_description.length > 50 ? '...' : ''}`
              : "Material Transport",
            notes: `Gate Pass: ${pass.reference_number}`,
            entry_time: now,
            access_type: "entry",
            validation_status: "valid",
            material_gate_pass_id: passId, // FK link - triggers sync_gate_entry_to_parent
          });

        if (error) throw error;

      } else {
        // Find the open entry log by FK link first (preferred), then by vehicle plate (fallback)
        let openLog: { id: string } | null = null;

        // Primary: Find by FK link
        const { data: fkLogs } = await supabase
          .from("gate_entry_logs")
          .select("id")
          .eq("tenant_id", profile.tenant_id)
          .eq("material_gate_pass_id", passId)
          .is("exit_time", null)
          .order("entry_time", { ascending: false })
          .limit(1);

        openLog = fkLogs?.[0] || null;

        // Fallback: Find by vehicle plate if no FK match
        if (!openLog && pass.vehicle_plate) {
          const { data: plateLogs } = await supabase
            .from("gate_entry_logs")
            .select("id")
            .eq("tenant_id", profile.tenant_id)
            .eq("car_plate", pass.vehicle_plate)
            .eq("entry_type", "vehicle")
            .is("exit_time", null)
            .order("entry_time", { ascending: false })
            .limit(1);

          openLog = plateLogs?.[0] || null;
        }

        if (openLog) {
          // Update exit_time on the log - DB trigger handles pass status update to 'completed'
          const { error } = await supabase
            .from("gate_entry_logs")
            .update({ exit_time: now })
            .eq("id", openLog.id);

          if (error) throw error;
        } else {
          // Fallback for legacy passes without entry logs
          console.warn("No entry log found for pass exit. Updating pass directly.");
          const { error } = await supabase
            .from("material_gate_passes")
            .update({
              exit_time: now,
              guard_verified_by: user.id,
              guard_verified_at: now,
              status: "completed",
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
      queryClient.invalidateQueries({ queryKey: ["gate-entries"] });
      queryClient.invalidateQueries({ queryKey: ["gate-pass-details"] });
      toast.success(action === "entry" ? "Entry recorded" : "Exit recorded - pass completed");
    },
    onError: (error) => {
      toast.error(`Failed to verify: ${error.message}`);
    },
  });
}

interface BulkApproveParams {
  passIds: string[];
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
    mutationFn: async ({ passIds, notes }: BulkApproveParams): Promise<BulkResult> => {
      if (!user?.id) throw new Error("Not authenticated");

      const results: BulkResult = { success: 0, failed: 0, errors: [] };

      for (const passId of passIds) {
        try {
          // Use the unified RPC for approval (handles all workflow stages)
          const { data, error } = await supabase.rpc("approve_gate_pass_unified", {
            p_user_id: user.id,
            p_gate_pass_id: passId,
            p_action: "approve",
            p_notes: notes || null,
          });

          if (error) {
            results.failed++;
            results.errors.push({ passId, error: error.message });
            continue;
          }

          // RPC returns string (new_status) on success, not an object
          // If data is a string, approval succeeded
          if (typeof data === "string") {
            results.success++;
          } else {
            // Fallback for unexpected response
            results.failed++;
            results.errors.push({ passId, error: "Unexpected response format" });
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
      queryClient.invalidateQueries({ queryKey: ["my-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["gate-pass-details"] });

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

      for (const passId of passIds) {
        try {
          // Use unified RPC for rejection - ensures proper audit logging
          const { data, error } = await supabase.rpc("approve_gate_pass_unified", {
            p_user_id: user.id,
            p_gate_pass_id: passId,
            p_action: "reject",
            p_notes: reason,
          });

          if (error) {
            results.failed++;
            results.errors.push({ passId, error: error.message });
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
      queryClient.invalidateQueries({ queryKey: ["my-gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["gate-pass-details"] });

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
