import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useMemo } from "react";
import { ContractorProject, useCreateContractorProject, useUpdateContractorProject } from "@/hooks/contractor-management/use-contractor-projects";
import { useContractorCompanies } from "@/hooks/contractor-management/use-contractor-companies";
import { useProjectManagers } from "@/hooks/contractor-management/use-project-managers";
import { useTenantBranches, useTenantSites, useTenantDepartments } from "@/hooks/use-org-hierarchy";
import { LocationBoundaryPicker } from "@/components/shared/LocationBoundaryPicker";
import { Loader2 } from "lucide-react";

interface Coordinate {
  lat: number;
  lng: number;
}

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ContractorProject | null;
}

export function ProjectFormDialog({ open, onOpenChange, project }: ProjectFormDialogProps) {
  const { t } = useTranslation();
  const createProject = useCreateContractorProject();
  const updateProject = useUpdateContractorProject();
  const { data: companies = [] } = useContractorCompanies({ status: "active" });
  const { data: managers = [] } = useProjectManagers();
  const { data: branches = [] } = useTenantBranches();
  const { data: sites = [] } = useTenantSites();
  const { data: departments = [] } = useTenantDepartments();
  const isEditing = !!project;

  const [formData, setFormData] = useState({
    company_id: "", project_code: "", project_name: "", project_name_ar: "",
    start_date: "", end_date: "", location_description: "", notes: "", project_manager_id: "",
    branch_id: "",
    site_id: "",
    department_id: "",
    latitude: null as number | null,
    longitude: null as number | null,
    boundary_polygon: null as Coordinate[] | null,
    geofence_radius_meters: 100,
  });

  const [showMap, setShowMap] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // Cascading filters: Sites filtered by selected branch
  const filteredSites = useMemo(() => {
    if (!formData.branch_id) return [];
    return sites.filter(s => s.branch_id === formData.branch_id);
  }, [sites, formData.branch_id]);

  // Cascading filters: Departments filtered by selected branch (including hybrid departments with branch_id = null)
  const filteredDepartments = useMemo(() => {
    if (!formData.branch_id) return [];
    return departments.filter(d => 
      d.branch_id === null || d.branch_id === formData.branch_id
    );
  }, [departments, formData.branch_id]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setShowMap(true), 200);
      return () => clearTimeout(timer);
    } else {
      setShowMap(false);
    }
  }, [open]);

  useEffect(() => {
    if (project) {
      setFormData({
        company_id: project.company_id,
        project_code: project.project_code,
        project_name: project.project_name,
        project_name_ar: project.project_name_ar || "",
        start_date: project.start_date,
        end_date: project.end_date,
        location_description: project.location_description || "",
        notes: project.notes || "",
        project_manager_id: project.project_manager_id || "",
        branch_id: (project as any).branch_id || "",
        site_id: project.site_id || "",
        department_id: (project as any).department_id || "",
        latitude: (project as any).latitude ?? null,
        longitude: (project as any).longitude ?? null,
        boundary_polygon: (project as any).boundary_polygon ?? null,
        geofence_radius_meters: (project as any).geofence_radius_meters ?? 100,
      });
    } else {
      setFormData({ 
        company_id: "", project_code: "", project_name: "", project_name_ar: "", 
        start_date: "", end_date: "", location_description: "", notes: "", project_manager_id: "",
        branch_id: "", site_id: "", department_id: "",
        latitude: null, longitude: null, boundary_polygon: null, geofence_radius_meters: 100 
      });
    }
    setActiveTab("details");
  }, [project, open]);

  // Reset site and department when branch changes
  const handleBranchChange = (branchId: string) => {
    setFormData(prev => ({
      ...prev,
      branch_id: branchId,
      site_id: "", // Reset site when branch changes
      department_id: "", // Reset department when branch changes
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      company_id: formData.company_id,
      project_code: formData.project_code,
      project_name: formData.project_name,
      project_name_ar: formData.project_name_ar || null,
      start_date: formData.start_date,
      end_date: formData.end_date,
      location_description: formData.location_description || null,
      notes: formData.notes || null,
      project_manager_id: formData.project_manager_id || null,
      branch_id: formData.branch_id || null,
      site_id: formData.site_id || null,
      department_id: formData.department_id || null,
      latitude: formData.latitude,
      longitude: formData.longitude,
      boundary_polygon: formData.boundary_polygon,
      geofence_radius_meters: formData.geofence_radius_meters,
    };
    if (isEditing) {
      await updateProject.mutateAsync({ id: project.id, data: submitData });
    } else {
      await createProject.mutateAsync(submitData);
    }
    onOpenChange(false);
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handlePolygonChange = (polygon: Coordinate[] | null) => {
    setFormData(prev => ({ ...prev, boundary_polygon: polygon }));
  };

  const handleRadiusChange = (radius: number) => {
    setFormData(prev => ({ ...prev, geofence_radius_meters: radius }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("contractors.projects.editProject", "Edit Project") : t("contractors.projects.addProject", "Add Project")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">{t("contractors.projects.details", "Details")}</TabsTrigger>
              <TabsTrigger value="location">{t("location.locationTab", "Location")}</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t("contractors.projects.company", "Company")} *</Label>
                <Select value={formData.company_id} onValueChange={(v) => setFormData({ ...formData, company_id: v })} disabled={isEditing}>
                  <SelectTrigger><SelectValue placeholder={t("contractors.projects.selectCompany", "Select company")} /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("contractors.projects.projectManager", "Project Manager")} *</Label>
                <Select value={formData.project_manager_id} onValueChange={(v) => setFormData({ ...formData, project_manager_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t("contractors.projects.selectProjectManager", "Select project manager")} /></SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Branch, Site, Department Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("common.branch", "Branch")} *</Label>
                  <Select value={formData.branch_id} onValueChange={handleBranchChange}>
                    <SelectTrigger><SelectValue placeholder={t("common.selectBranch", "Select branch")} /></SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("common.site", "Site")}</Label>
                  <Select 
                    value={formData.site_id} 
                    onValueChange={(v) => setFormData({ ...formData, site_id: v })}
                    disabled={!formData.branch_id}
                  >
                    <SelectTrigger><SelectValue placeholder={t("common.selectSite", "Select site")} /></SelectTrigger>
                    <SelectContent>
                      {filteredSites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("common.department", "Department")}</Label>
                <Select 
                  value={formData.department_id} 
                  onValueChange={(v) => setFormData({ ...formData, department_id: v })}
                  disabled={!formData.branch_id}
                >
                  <SelectTrigger><SelectValue placeholder={t("common.selectDepartment", "Select department")} /></SelectTrigger>
                  <SelectContent>
                    {filteredDepartments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("contractors.projects.code", "Project Code")} *</Label>
                  <Input value={formData.project_code} onChange={(e) => setFormData({ ...formData, project_code: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>{t("contractors.projects.name", "Project Name")} *</Label>
                  <Input value={formData.project_name} onChange={(e) => setFormData({ ...formData, project_name: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("contractors.projects.startDate", "Start Date")} *</Label>
                  <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>{t("contractors.projects.endDate", "End Date")} *</Label>
                  <Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("contractors.projects.notes", "Notes")}</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
            </TabsContent>

            <TabsContent value="location" className="space-y-4 mt-4">
              {showMap ? (
                <LocationBoundaryPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  boundaryPolygon={formData.boundary_polygon}
                  geofenceRadius={formData.geofence_radius_meters}
                  onLocationChange={handleLocationChange}
                  onPolygonChange={handlePolygonChange}
                  onRadiusChange={handleRadiusChange}
                  title={t("contractors.projects.projectLocation", "Project Location")}
                />
              ) : (
                <div className="h-[400px] rounded-lg border bg-muted/30 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              <div className="space-y-2">
                <Label>{t("contractors.projects.locationDescription", "Location Description")}</Label>
                <Textarea 
                  value={formData.location_description} 
                  onChange={(e) => setFormData({ ...formData, location_description: e.target.value })} 
                  placeholder={t("contractors.projects.locationDescriptionPlaceholder", "Additional location details...")}
                  rows={2}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", "Cancel")}</Button>
            <Button type="submit" disabled={createProject.isPending || updateProject.isPending || !formData.project_manager_id}>
              {(createProject.isPending || updateProject.isPending) && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isEditing ? t("common.save", "Save") : t("common.create", "Create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
