import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePTWTypes } from "@/hooks/ptw";
import { useSites } from "@/hooks/use-sites";
import { useMobilizationCheck } from "@/features/ptw/hooks/use-mobilization-check";
import { MobilizationStatusBanner } from '@/features/ptw';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Flame, Construction, Shield, Shovel, Radiation, Zap, Mountain, FileWarning, Wrench } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const permitTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  HOT_WORK: Flame,
  LIFTING: Construction,
  CONFINED_SPACE: Shield,
  EXCAVATION: Shovel,
  RADIOGRAPHY: Radiation,
  ELECTRICAL: Zap,
  HEIGHT: Mountain,
  COLD_WORK: Wrench,
};

interface PermitBasicsStepProps {
  data: {
    project_id?: string;
    type_id?: string;
    site_id?: string;
    building_id?: string;
    floor_zone_id?: string;
    location_details?: string;
    gps_lat?: number;
    gps_lng?: number;
    planned_start_time?: string;
    planned_end_time?: string;
    job_description?: string;
    contractor_id?: string;
    contractor_name?: string;
  };
  onChange: (data: Partial<PermitBasicsStepProps["data"]>) => void;
}

/**
 * Hook to fetch contractor_projects that have an approved mobilization.
 * These are the only projects eligible for PTW permit creation.
 */
function useApprovedProjects() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["approved-projects-for-ptw", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Get all mobilizations that are approved
      const { data: mobilizations, error: mobError } = await supabase
        .from("project_mobilizations")
        .select("project_id")
        .eq("status", "approved")
        .is("deleted_at", null);

      if (mobError || !mobilizations || mobilizations.length === 0) return [];

      const approvedProjectIds = mobilizations.map((m: any) => m.project_id);

      // Get those contractor_projects
      const { data: projects, error } = await supabase
        .from("contractor_projects")
        .select(`
          id, project_name, project_code, company_id, site_id, project_manager_id,
          company:contractor_companies(company_name),
          site:sites(id, name),
          project_manager:profiles!contractor_projects_project_manager_id_fkey(full_name)
        `)
        .eq("tenant_id", tenantId)
        .in("id", approvedProjectIds)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("project_name");

      if (error) throw error;
      return projects || [];
    },
    enabled: !!tenantId,
  });
}

export function PermitBasicsStep({ data, onChange }: PermitBasicsStepProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar" || i18n.language === "ur";
  
  const { data: permitTypes, isLoading: typesLoading, error: typesError } = usePTWTypes();
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useApprovedProjects();
  const { data: sites, isLoading: sitesLoading } = useSites();

  useEffect(() => {
    if (typesError) console.error('[PTW] Failed to load permit types:', typesError);
    if (projectsError) console.error('[PTW] Failed to load projects:', projectsError);
  }, [typesError, projectsError]);
  
  // Mobilization status check for selected project
  const { data: mobilizationStatus, isLoading: mobilizationLoading } = useMobilizationCheck(data.project_id);

  const selectedType = permitTypes?.find(pt => pt.id === data.type_id);

  // Auto-populate contractor and site when project is selected
  useEffect(() => {
    if (data.project_id && projects) {
      const selectedProject = projects.find((p: any) => p.id === data.project_id);
      if (selectedProject) {
        const updates: Partial<PermitBasicsStepProps["data"]> = {};
        
        const company = selectedProject.company as { company_name: string } | null;
        if (company && company.company_name !== data.contractor_name) {
          updates.contractor_id = (selectedProject as any).company_id;
          updates.contractor_name = company.company_name;
        }
        
        const site = selectedProject.site as { id: string; name: string } | null;
        if (site && !data.site_id) {
          updates.site_id = site.id;
        }
        
        if (Object.keys(updates).length > 0) {
          onChange(updates);
        }
      }
    }
  }, [data.project_id, projects, data.contractor_name, data.site_id, onChange]);

  return (
    <div className="space-y-6">
      {/* Project Selection — only approved mobilization projects */}
      <div className="space-y-2">
        <Label htmlFor="project_id">
          {t("ptw.form.project", "Project")} <span className="text-destructive">*</span>
        </Label>
        {projectsLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={data.project_id}
            onValueChange={(value) => onChange({ project_id: value })}
          >
            <SelectTrigger id="project_id">
              <SelectValue placeholder={t("ptw.form.selectProject", "Select project")} />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project: any) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <span>{project.project_name}</span>
                    <span className="text-xs text-muted-foreground">({project.project_code})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {projects?.length === 0 && !projectsLoading && (
          <p className="text-sm text-muted-foreground">
            {t("ptw.form.noActiveProjects", "No projects with approved mobilization. Complete site mobilization first.")}
          </p>
        )}
      </div>

      {/* Mobilization Status Banner */}
      {data.project_id && (
        <MobilizationStatusBanner 
          status={mobilizationStatus} 
          isLoading={mobilizationLoading}
          projectId={data.project_id}
        />
      )}

      {/* Permit Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="type_id">
          {t("ptw.form.permitType", "Permit Type")} <span className="text-destructive">*</span>
        </Label>
        {typesLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={data.type_id}
            onValueChange={(value) => onChange({ type_id: value })}
          >
            <SelectTrigger id="type_id">
              <SelectValue placeholder={t("ptw.form.selectPermitType", "Select permit type")} />
            </SelectTrigger>
            <SelectContent>
              {permitTypes?.map((type) => {
                const IconComponent = permitTypeIcons[type.code] || FileWarning;
                return (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4" />
                      <span>{isRTL && type.name_ar ? type.name_ar : type.name}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
        {permitTypes?.length === 0 && !typesLoading && (
          <p className="text-sm text-muted-foreground">
            {t("ptw.form.noPermitTypes", "No permit types configured. Please contact your administrator.")}
          </p>
        )}
        {typesError && (
          <p className="text-sm text-destructive">
            {t("ptw.form.permitTypesError", "Failed to load permit types. Please try again.")}
          </p>
        )}
        {selectedType && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedType.requires_gas_test && (
              <Badge variant="secondary">
                {t("ptw.form.requiresGasTest", "Requires Gas Test")}
              </Badge>
            )}
            {selectedType.requires_loto && (
              <Badge variant="secondary">
                {t("ptw.form.requiresLOTO", "Requires LOTO")}
              </Badge>
            )}
            <Badge variant="outline">
              {t("ptw.form.validityHours", "Valid for {{hours}}h", { hours: selectedType.validity_hours })}
            </Badge>
          </div>
        )}
      </div>

      {/* Site Selection */}
      <div className="space-y-2">
        <Label htmlFor="site_id">
          {t("ptw.form.site", "Site / Location")}
        </Label>
        {sitesLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            value={data.site_id}
            onValueChange={(value) => onChange({ site_id: value })}
          >
            <SelectTrigger id="site_id">
              <SelectValue placeholder={t("ptw.form.selectSite", "Select site")} />
            </SelectTrigger>
            <SelectContent>
              {sites?.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Location Details */}
      <div className="space-y-2">
        <Label htmlFor="location_details">
          {t("ptw.form.locationDetails", "Location Details")}
        </Label>
        <Input
          id="location_details"
          placeholder={t("ptw.form.locationDetailsPlaceholder", "Specific work location (e.g., Building A, 3rd Floor)")}
          value={data.location_details || ""}
          onChange={(e) => onChange({ location_details: e.target.value })}
        />
      </div>

      {/* Date/Time */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="planned_start_time">
            {t("ptw.form.plannedStart", "Planned Start")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="planned_start_time"
            type="datetime-local"
            value={data.planned_start_time || ""}
            onChange={(e) => onChange({ planned_start_time: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="planned_end_time">
            {t("ptw.form.plannedEnd", "Planned End")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="planned_end_time"
            type="datetime-local"
            value={data.planned_end_time || ""}
            onChange={(e) => onChange({ planned_end_time: e.target.value })}
          />
        </div>
      </div>

      {/* Job Description */}
      <div className="space-y-2">
        <Label htmlFor="job_description">
          {t("ptw.form.jobDescription", "Job Description")} <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="job_description"
          placeholder={t("ptw.form.jobDescriptionPlaceholder", "Describe the work to be performed...")}
          value={data.job_description || ""}
          onChange={(e) => onChange({ job_description: e.target.value })}
          rows={4}
        />
      </div>
    </div>
  );
}
