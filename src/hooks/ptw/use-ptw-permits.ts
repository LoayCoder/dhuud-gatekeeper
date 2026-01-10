import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PTWPermit {
  id: string;
  tenant_id: string;
  reference_id: string;
  project_id: string;
  type_id: string;
  status: string;
  site_id: string | null;
  building_id: string | null;
  floor_zone_id: string | null;
  location_details: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  applicant_id: string;
  endorser_id: string | null;
  issuer_id: string | null;
  planned_start_time: string;
  planned_end_time: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  extended_until: string | null;
  extension_count: number;
  simops_status: string | null;
  simops_notes: string | null;
  risk_assessment_ref: string | null;
  job_description: string | null;
  work_scope: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  evacuation_point: string | null;
  requested_at: string | null;
  endorsed_at: string | null;
  issued_at: string | null;
  activated_at: string | null;
  suspended_at: string | null;
  closed_at: string | null;
  closed_by: string | null;
  closure_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  permit_type?: { name: string; code: string; color: string } | null;
  project?: { name: string; reference_id: string } | null;
  applicant?: { full_name: string } | null;
  issuer?: { full_name: string } | null;
  site?: { name: string } | null;
}

export interface PTWPermitFilters {
  search?: string;
  status?: string;
  typeId?: string;
  projectId?: string;
  siteId?: string;
}

export function usePTWPermits(filters: PTWPermitFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["ptw-permits", tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("ptw_permits")
        .select(`
          id, tenant_id, reference_id, project_id, type_id, status,
          site_id, building_id, floor_zone_id, location_details, gps_lat, gps_lng,
          applicant_id, endorser_id, issuer_id,
          planned_start_time, planned_end_time, actual_start_time, actual_end_time,
          extended_until, extension_count, simops_status, simops_notes,
          risk_assessment_ref, job_description, work_scope,
          emergency_contact_name, emergency_contact_number, evacuation_point,
          requested_at, endorsed_at, issued_at, activated_at, suspended_at,
          closed_at, closed_by, closure_notes,
          created_by, created_at, updated_at,
          permit_type:ptw_types(name, code, color),
          project:ptw_projects(name, reference_id),
          applicant:profiles!ptw_permits_applicant_id_fkey(full_name),
          issuer:profiles!ptw_permits_issuer_id_fkey(full_name),
          site:sites(name)
        `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.search) {
        query = query.or(`reference_id.ilike.%${filters.search}%,job_description.ilike.%${filters.search}%`);
      }
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.typeId) query = query.eq("type_id", filters.typeId);
      if (filters.projectId) query = query.eq("project_id", filters.projectId);
      if (filters.siteId) query = query.eq("site_id", filters.siteId);

      const { data, error } = await query;
      if (error) throw error;
      return data as PTWPermit[];
    },
    enabled: !!tenantId,
  });
}

export function usePTWPermit(permitId: string | undefined) {
  return useQuery({
    queryKey: ["ptw-permit", permitId],
    queryFn: async () => {
      if (!permitId) return null;

      const { data, error } = await supabase
        .from("ptw_permits")
        .select(`
          id, tenant_id, reference_id, project_id, type_id, status,
          site_id, building_id, floor_zone_id, location_details, gps_lat, gps_lng,
          applicant_id, endorser_id, issuer_id,
          planned_start_time, planned_end_time, actual_start_time, actual_end_time,
          extended_until, extension_count, simops_status, simops_notes,
          risk_assessment_ref, job_description, work_scope,
          emergency_contact_name, emergency_contact_number, evacuation_point,
          requested_at, endorsed_at, issued_at, activated_at, suspended_at,
          closed_at, closed_by, closure_notes,
          created_by, created_at, updated_at,
          permit_type:ptw_types(name, code, color),
          project:ptw_projects(name, reference_id),
          applicant:profiles!ptw_permits_applicant_id_fkey(full_name),
          issuer:profiles!ptw_permits_issuer_id_fkey(full_name),
          site:sites(name)
        `)
        .eq("id", permitId)
        .single();

      if (error) throw error;
      return data as PTWPermit;
    },
    enabled: !!permitId,
  });
}

export function useCreatePTWPermit() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<PTWPermit> & { worker_ids?: string[]; permit_holder_id?: string }) => {
      if (!profile?.tenant_id || !user?.id) throw new Error("No tenant");

      // Pre-submission validation via Edge Function
      const { data: validationResult, error: validationError } = await supabase.functions.invoke(
        "validate-permit-request",
        {
          body: {
            project_id: data.project_id,
            type_id: data.type_id,
            worker_ids: data.worker_ids || [],
            planned_start_time: data.planned_start_time,
            planned_end_time: data.planned_end_time,
            site_id: data.site_id,
          },
        }
      );

      if (validationError) {
        console.error("Validation error:", validationError);
        throw new Error("Failed to validate permit request");
      }

      if (!validationResult?.is_valid) {
        const errorMessages = validationResult?.errors?.map((e: { message: string }) => e.message).join("; ") || "Validation failed";
        throw new Error(errorMessages);
      }

      const insertData = {
        project_id: data.project_id!,
        type_id: data.type_id!,
        applicant_id: user.id,
        job_description: data.job_description,
        work_scope: data.work_scope,
        location_details: data.location_details,
        site_id: data.site_id,
        building_id: data.building_id,
        floor_zone_id: data.floor_zone_id,
        planned_start_time: data.planned_start_time!,
        planned_end_time: data.planned_end_time!,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_number: data.emergency_contact_number,
        tenant_id: profile.tenant_id,
        created_by: user.id,
      };

      const { data: result, error } = await supabase
        .from("ptw_permits")
        .insert(insertData as never)
        .select()
        .single();

      if (error) throw error;

      // Store worker assignments in operational_data or a junction table
      // For now, we store in operational_data as JSON
      if (data.worker_ids && data.worker_ids.length > 0) {
        const { error: updateError } = await supabase
          .from("ptw_permits")
          .update({
            work_scope: JSON.stringify({
              worker_ids: data.worker_ids,
              permit_holder_id: data.permit_holder_id,
            }),
          })
          .eq("id", result.id);

        if (updateError) {
          console.error("Failed to store worker assignments:", updateError);
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ptw-permits"] });
      toast.success("Permit created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePermitStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ permitId, status, notes }: { permitId: string; status: string; notes?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const updateData: Record<string, unknown> = { status };

      if (status === "endorsed") {
        updateData.endorsed_at = new Date().toISOString();
        updateData.endorser_id = user.id;
      } else if (status === "issued") {
        updateData.issued_at = new Date().toISOString();
        updateData.issuer_id = user.id;
      } else if (status === "activated") {
        updateData.activated_at = new Date().toISOString();
        updateData.actual_start_time = new Date().toISOString();
      } else if (status === "suspended") {
        updateData.suspended_at = new Date().toISOString();
      } else if (status === "closed") {
        updateData.closed_at = new Date().toISOString();
        updateData.closed_by = user.id;
        updateData.closure_notes = notes;
        updateData.actual_end_time = new Date().toISOString();
      } else if (status === "rejected") {
        updateData.closure_notes = notes;
      }

      const { data, error } = await supabase
        .from("ptw_permits")
        .update(updateData)
        .eq("id", permitId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, rejectionReason: notes };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["ptw-permits"] });
      queryClient.invalidateQueries({ queryKey: ["ptw-permit", data.id] });
      
      // Send email notification for key status changes
      const notifiableStatuses = ["issued", "rejected", "activated", "suspended", "closed"];
      if (notifiableStatuses.includes(data.status)) {
        try {
          await supabase.functions.invoke("send-ptw-email", {
            body: {
              permit_id: data.id,
              notification_type: data.status,
              rejection_reason: data.status === "rejected" ? data.rejectionReason : undefined,
            },
          });
        } catch (emailError) {
          console.error("Failed to send PTW email notification:", emailError);
          // Don't show error to user - email is a fallback notification
        }
      }
      
      toast.success(`Permit ${data.status}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useActivePermitsForMap() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["ptw-permits-map", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("ptw_permits")
        .select(`
          id, reference_id, type_id, status, gps_lat, gps_lng, location_details,
          permit_type:ptw_types(name, color)
        `)
        .eq("tenant_id", tenantId)
        .in("status", ["activated", "issued"])
        .is("deleted_at", null);

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useDeletePTWPermit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (permitId: string) => {
      // Use SECURITY DEFINER function to bypass RLS issues
      // This also cascades soft-delete to clearance checks and safety requirements
      const { error } = await supabase
        .rpc('soft_delete_ptw_permit', { p_permit_id: permitId });

      if (error) throw error;
      return permitId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ptw-permits"] });
      toast.success("Permit deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
