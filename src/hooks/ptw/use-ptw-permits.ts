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
  issuer_id: string | null;
  planned_start_time: string;
  planned_end_time: string;
  actual_start_time: string | null;
  actual_end_time: string | null;
  simops_status: string;
  risk_assessment_ref: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  work_scope: string | null;
  job_description: string | null;
  created_at: string;
  updated_at: string;
  project?: { name: string; reference_id: string } | null;
  permit_type?: { name: string; code: string; risk_level: string; icon_name: string | null } | null;
  site?: { name: string } | null;
  applicant?: { full_name: string } | null;
  issuer?: { full_name: string } | null;
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
          applicant_id, issuer_id,
          planned_start_time, planned_end_time, actual_start_time, actual_end_time,
          simops_status, risk_assessment_ref, emergency_contact_name, emergency_contact_number,
          work_scope, job_description, created_at, updated_at,
          project:ptw_projects(name, reference_id),
          permit_type:ptw_types(name, code, risk_level, icon_name),
          site:sites(name),
          applicant:profiles!ptw_permits_applicant_id_fkey(full_name),
          issuer:profiles!ptw_permits_issuer_id_fkey(full_name)
        `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.search) {
        query = query.or(`reference_id.ilike.%${filters.search}%,work_scope.ilike.%${filters.search}%`);
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
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["ptw-permit", permitId],
    queryFn: async () => {
      if (!permitId || !tenantId) return null;

      const { data, error } = await supabase
        .from("ptw_permits")
        .select(`
          id, tenant_id, reference_id, project_id, type_id, status,
          site_id, building_id, floor_zone_id, location_details, gps_lat, gps_lng,
          applicant_id, issuer_id,
          planned_start_time, planned_end_time, actual_start_time, actual_end_time,
          simops_status, risk_assessment_ref, emergency_contact_name, emergency_contact_number,
          work_scope, job_description, created_at, updated_at,
          project:ptw_projects(name, reference_id),
          permit_type:ptw_types(name, code, risk_level, icon_name, requires_gas_test, requires_loto),
          site:sites(name),
          applicant:profiles!ptw_permits_applicant_id_fkey(full_name),
          issuer:profiles!ptw_permits_issuer_id_fkey(full_name)
        `)
        .eq("id", permitId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

      if (error) throw error;
      return data as PTWPermit;
    },
    enabled: !!permitId && !!tenantId,
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
          id, reference_id, status, gps_lat, gps_lng, location_details,
          planned_start_time, planned_end_time,
          permit_type:ptw_types(name, code, risk_level, icon_name, color)
        `)
        .eq("tenant_id", tenantId)
        .in("status", ["active", "issued", "endorsed"])
        .is("deleted_at", null)
        .not("gps_lat", "is", null)
        .not("gps_lng", "is", null);

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
  });
}

export function useCreatePTWPermit() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<PTWPermit>) => {
      if (!profile?.tenant_id || !profile?.id) throw new Error("Not authenticated");

      const { data: result, error } = await supabase
        .from("ptw_permits")
        .insert({
          project_id: data.project_id!,
          type_id: data.type_id!,
          site_id: data.site_id,
          building_id: data.building_id,
          floor_zone_id: data.floor_zone_id,
          location_details: data.location_details,
          gps_lat: data.gps_lat,
          gps_lng: data.gps_lng,
          applicant_id: profile.id,
          planned_start_time: data.planned_start_time!,
          planned_end_time: data.planned_end_time!,
          work_scope: data.work_scope,
          job_description: data.job_description,
          emergency_contact_name: data.emergency_contact_name,
          emergency_contact_number: data.emergency_contact_number,
          risk_assessment_ref: data.risk_assessment_ref,
          tenant_id: profile.tenant_id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ptw-permits"] });
      toast.success("Permit request created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePermitStatus() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ permitId, status }: { permitId: string; status: string }) => {
      if (!profile?.id) throw new Error("Not authenticated");

      const updateData: Record<string, unknown> = { status };
      
      if (status === "endorsed" || status === "issued") {
        updateData.issuer_id = profile.id;
      }
      if (status === "active") {
        updateData.actual_start_time = new Date().toISOString();
      }
      if (status === "closed") {
        updateData.actual_end_time = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("ptw_permits")
        .update(updateData)
        .eq("id", permitId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ptw-permits"] });
      queryClient.invalidateQueries({ queryKey: ["ptw-permit", variables.permitId] });
      toast.success(`Permit ${variables.status}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
