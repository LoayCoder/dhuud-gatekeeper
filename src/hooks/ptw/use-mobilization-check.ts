import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MobilizationStatus {
  isReady: boolean;
  status: string;
  percentage: number;
  blockers: string[];
  contractorId: string | null;
  contractorName: string | null;
  siteId: string | null;
  siteName: string | null;
  projectManagerName: string | null;
}

/**
 * Validates the mobilization status of a PTW project.
 * A project must be "active" with 100% mobilization to allow permit creation.
 */
export function useMobilizationCheck(projectId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["mobilization-check", tenantId, projectId],
    queryFn: async (): Promise<MobilizationStatus> => {
      const emptyStatus: MobilizationStatus = {
        isReady: false,
        status: "unknown",
        percentage: 0,
        blockers: [],
        contractorId: null,
        contractorName: null,
        siteId: null,
        siteName: null,
        projectManagerName: null,
      };

      if (!projectId || !tenantId) {
        return emptyStatus;
      }

      const { data: project, error } = await supabase
        .from("ptw_projects")
        .select(`
          status, 
          mobilization_percentage,
          contractor_company_id,
          site_id,
          contractor_company:contractor_companies(id, company_name, status),
          site:sites(id, name),
          project_manager:profiles!ptw_projects_project_manager_id_fkey(full_name)
        `)
        .eq("id", projectId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

      if (error || !project) {
        console.warn("Project not found for mobilization check:", error);
        return {
          ...emptyStatus,
          status: "not_found",
          blockers: ["Project not found"],
        };
      }

      const blockers: string[] = [];
      
      // Check project status
      if (project.status !== "active") {
        blockers.push(`Project status is "${project.status}" (must be "active")`);
      }
      
      // Check mobilization percentage
      if (project.mobilization_percentage < 100) {
        blockers.push(`Mobilization at ${project.mobilization_percentage}% (requires 100%)`);
      }
      
      // Check contractor status
      const contractor = project.contractor_company as { id: string; company_name: string; status: string } | null;
      if (contractor && contractor.status !== "active") {
        blockers.push(`Contractor status is "${contractor.status}" (must be "active")`);
      }

      const site = project.site as { id: string; name: string } | null;
      const projectManager = project.project_manager as { full_name: string } | null;

      return {
        isReady: project.status === "active" && 
                 project.mobilization_percentage === 100 &&
                 (!contractor || contractor.status === "active"),
        status: project.status,
        percentage: project.mobilization_percentage,
        blockers,
        contractorId: contractor?.id || null,
        contractorName: contractor?.company_name || null,
        siteId: site?.id || null,
        siteName: site?.name || null,
        projectManagerName: projectManager?.full_name || null,
      };
    },
    enabled: !!tenantId && !!projectId,
    staleTime: 30000, // Cache for 30 seconds
  });
}
