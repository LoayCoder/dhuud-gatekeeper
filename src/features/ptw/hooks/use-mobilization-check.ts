import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
 * Check mobilization readiness for a contractor project.
 * Now queries project_mobilizations instead of ptw_projects.
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

      if (!projectId || !tenantId) return emptyStatus;

      // Get project from contractor_projects (single source of truth)
      const { data: project, error: projectError } = await supabase
        .from("contractor_projects")
        .select(`
          id, status,
          company:contractor_companies(id, company_name, status),
          site:sites(id, name),
          project_manager:profiles!contractor_projects_project_manager_id_fkey(full_name)
        `)
        .eq("id", projectId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

      if (projectError || !project) {
        return { ...emptyStatus, status: "not_found", blockers: ["Project not found"] };
      }

      // Get mobilization record
      const { data: mobilization } = await supabase
        .from("project_mobilizations")
        .select("status, mobilization_percentage, pre_checks_completed, site_clearance_approved, ptw_enabled")
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .maybeSingle();

      const blockers: string[] = [];

      if (project.status !== "active") {
        blockers.push(`Project status is "${project.status}" (must be "active")`);
      }

      const company = project.company as { id: string; company_name: string; status: string } | null;
      if (company && company.status !== "active") {
        blockers.push(`Contractor status is "${company.status}" (must be "active")`);
      }

      if (!mobilization) {
        blockers.push("Mobilization not started");
      } else if (mobilization.status !== "approved") {
        blockers.push(`Mobilization status is "${mobilization.status}" (must be "approved")`);
      }

      const site = project.site as { id: string; name: string } | null;
      const pm = project.project_manager as { full_name: string } | null;

      const isReady =
        project.status === "active" &&
        (!company || company.status === "active") &&
        mobilization?.status === "approved";

      return {
        isReady,
        status: mobilization?.status || "pending",
        percentage: mobilization?.mobilization_percentage || 0,
        blockers,
        contractorId: company?.id || null,
        contractorName: company?.company_name || null,
        siteId: site?.id || null,
        siteName: site?.name || null,
        projectManagerName: pm?.full_name || null,
      };
    },
    enabled: !!tenantId && !!projectId,
    staleTime: 30000,
  });
}
