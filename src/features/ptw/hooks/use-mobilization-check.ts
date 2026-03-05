import { useQuery } from "@tanstack/react-query";
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

      const { getMobilizationProject } = await import("@/features/ptw/services/ptwProjectService");
      const project = await getMobilizationProject(projectId, tenantId);

      if (!project) {
        return {
          ...emptyStatus,
          status: "not_found",
          blockers: ["Project not found"],
        };
      }

      const blockers: string[] = [];

      if (project.status !== "active") {
        blockers.push(`Project status is "${project.status}" (must be "active")`);
      }

      if (project.mobilization_percentage < 100) {
        blockers.push(`Mobilization at ${project.mobilization_percentage}% (requires 100%)`);
      }

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
    staleTime: 30000,
  });
}
