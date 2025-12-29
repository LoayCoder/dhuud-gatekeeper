import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Coordinate {
  lat: number;
  lng: number;
}

export interface ContractorProject {
  id: string;
  tenant_id: string;
  company_id: string;
  project_code: string;
  project_name: string;
  project_name_ar: string | null;
  site_id: string | null;
  location_description: string | null;
  start_date: string;
  end_date: string;
  status: string;
  assigned_workers_count: number;
  required_safety_officers: number;
  notes: string | null;
  project_manager_id: string | null;
  latitude: number | null;
  longitude: number | null;
  boundary_polygon: Coordinate[] | null;
  geofence_radius_meters: number;
  created_at: string;
  updated_at: string;
  company?: { company_name: string } | null;
  site?: { name: string } | null;
  project_manager?: { id: string; full_name: string } | null;
}

export interface ContractorProjectFilters {
  search?: string;
  companyId?: string;
  status?: string;
}

export function useContractorProjects(filters: ContractorProjectFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["contractor-projects", tenantId, filters],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from("contractor_projects")
        .select(`
          id, tenant_id, company_id, project_code, project_name, project_name_ar,
          site_id, location_description, start_date, end_date, status,
          assigned_workers_count, required_safety_officers, notes, project_manager_id,
          latitude, longitude, boundary_polygon, geofence_radius_meters,
          created_at, updated_at,
          company:contractor_companies(company_name),
          site:sites(name),
          project_manager:profiles!contractor_projects_project_manager_id_fkey(id, full_name)
        `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.search) {
        query = query.or(`project_name.ilike.%${filters.search}%,project_code.ilike.%${filters.search}%`);
      }
      if (filters.companyId) query = query.eq("company_id", filters.companyId);
      if (filters.status) query = query.eq("status", filters.status);

      const { data, error } = await query;
      if (error) throw error;
      
      // Map boundary_polygon from Json to Coordinate[]
      return (data ?? []).map(item => ({
        ...item,
        boundary_polygon: item.boundary_polygon as unknown as Coordinate[] | null,
      })) as ContractorProject[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateContractorProject() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<ContractorProject>) => {
      if (!profile?.tenant_id) throw new Error("No tenant");

      const insertPayload = {
        company_id: data.company_id!,
        project_code: data.project_code!,
        project_name: data.project_name!,
        project_name_ar: data.project_name_ar,
        site_id: data.site_id,
        location_description: data.location_description,
        start_date: data.start_date!,
        end_date: data.end_date!,
        notes: data.notes,
        project_manager_id: data.project_manager_id,
        latitude: data.latitude,
        longitude: data.longitude,
        boundary_polygon: data.boundary_polygon as unknown,
        geofence_radius_meters: data.geofence_radius_meters ?? 100,
        tenant_id: profile.tenant_id,
        status: "planned",
      };

      const { data: result, error } = await supabase
        .from("contractor_projects")
        .insert(insertPayload as never)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-projects"] });
      toast.success("Project created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateContractorProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContractorProject> }) => {
      const updatePayload = {
        ...data,
        boundary_polygon: data.boundary_polygon as unknown,
      };
      
      const { data: result, error } = await supabase
        .from("contractor_projects")
        .update(updatePayload as never)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-projects"] });
      toast.success("Project updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
