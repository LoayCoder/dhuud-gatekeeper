import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { projectFormSchema, ProjectFormValues } from "./projectFormSchema";
import { ContractorProject, useCreateContractorProject, useUpdateContractorProject } from "@/features/contractors/hooks/use-contractor-projects";
import { useContractorCompanies } from "@/features/contractors/hooks/use-contractor-companies";
import { useProjectManagers } from "@/features/contractors/hooks/use-project-managers";
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

type ExtendedProject = ContractorProject & {
  branch_id?: string;
  site_id?: string;
  department_id?: string;
  latitude?: number;
  longitude?: number;
  boundary_polygon?: Coordinate[];
  geofence_radius_meters?: number;
};

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

  const extProject = project as ExtendedProject | null;

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      company_id: extProject?.company_id ?? "",
      project_code: extProject?.project_code ?? "",
      project_name: extProject?.project_name ?? "",
      project_name_ar: extProject?.project_name_ar ?? "",
      start_date: extProject?.start_date ?? "",
      end_date: extProject?.end_date ?? "",
      location_description: extProject?.location_description ?? "",
      notes: extProject?.notes ?? "",
      project_manager_id: extProject?.project_manager_id ?? "",
      branch_id: extProject?.branch_id ?? "",
      site_id: extProject?.site_id ?? "",
      department_id: extProject?.department_id ?? "",
      latitude: extProject?.latitude ?? null,
      longitude: extProject?.longitude ?? null,
      boundary_polygon: extProject?.boundary_polygon ?? null,
      geofence_radius_meters: extProject?.geofence_radius_meters ?? 100,
    },
  });

  const watchedBranchId = form.watch("branch_id");

  // Cascading filters: Sites filtered by selected branch
  const filteredSites = useMemo(() => {
    if (!watchedBranchId) return [];
    return sites.filter(s => s.branch_id === watchedBranchId);
  }, [sites, watchedBranchId]);

  // Cascading filters: Departments filtered by selected branch (including hybrid departments with branch_id = null)
  const filteredDepartments = useMemo(() => {
    if (!watchedBranchId) return [];
    return departments.filter(d =>
      d.branch_id === null || d.branch_id === watchedBranchId
    );
  }, [departments, watchedBranchId]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setShowMap(true), 200);
      return () => clearTimeout(timer);
    } else {
      setShowMap(false);
    }
  }, [open]);

  useEffect(() => {
    if (extProject) {
      form.reset({
        company_id: extProject.company_id,
        project_code: extProject.project_code,
        project_name: extProject.project_name,
        project_name_ar: extProject.project_name_ar || "",
        start_date: extProject.start_date,
        end_date: extProject.end_date,
        location_description: extProject.location_description || "",
        notes: extProject.notes || "",
        project_manager_id: extProject.project_manager_id || "",
        branch_id: extProject.branch_id || "",
        site_id: extProject.site_id || "",
        department_id: extProject.department_id || "",
        latitude: extProject.latitude ?? null,
        longitude: extProject.longitude ?? null,
        boundary_polygon: extProject.boundary_polygon ?? null,
        geofence_radius_meters: extProject.geofence_radius_meters ?? 100,
      });
    } else {
      form.reset({
        company_id: "", project_code: "", project_name: "", project_name_ar: "",
        start_date: "", end_date: "", location_description: "", notes: "", project_manager_id: "",
        branch_id: "", site_id: "", department_id: "",
        latitude: null, longitude: null, boundary_polygon: null, geofence_radius_meters: 100
      });
    }
    setActiveTab("details");
  }, [extProject, open, form]);

  const handleBranchChange = (value: string) => {
    form.setValue("branch_id", value);
    form.setValue("site_id", "");
    form.setValue("department_id", "");
  };

  const onSubmit = form.handleSubmit(async (data) => {
    const submitData = {
      ...data,
      project_name_ar: data.project_name_ar || null,
      location_description: data.location_description || null,
      notes: data.notes || null,
      project_manager_id: data.project_manager_id || null,
      branch_id: data.branch_id || null,
      site_id: data.site_id || null,
      department_id: data.department_id || null,
    };
    try {
      if (isEditing) {
        await updateProject.mutateAsync({ id: project.id, data: submitData });
      } else {
        await createProject.mutateAsync(submitData);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("[ProjectFormDialog] Submit failed:", error);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("contractors.projects.editProject", "Edit Project") : t("contractors.projects.addProject", "Add Project")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">{t("contractors.projects.details", "Details")}</TabsTrigger>
              <TabsTrigger value="location">{t("location.locationTab", "Location")}</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t("contractors.projects.company", "Company")} *</Label>
                <Controller
                  name="company_id"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isEditing}>
                        <SelectTrigger><SelectValue placeholder={t("contractors.projects.selectCompany", "Select company")} /></SelectTrigger>
                        <SelectContent>
                          {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {fieldState.error && <span className="text-destructive text-sm">{fieldState.error.message}</span>}
                    </>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("contractors.projects.projectManager", "Project Manager")} *</Label>
                <Controller
                  name="project_manager_id"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder={t("contractors.projects.selectProjectManager", "Select project manager")} /></SelectTrigger>
                        <SelectContent>
                          {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {fieldState.error && <span className="text-destructive text-sm">{fieldState.error.message}</span>}
                    </>
                  )}
                />
              </div>

              {/* Branch, Site, Department Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("common.branch", "Branch")} *</Label>
                  <Controller
                    name="branch_id"
                    control={form.control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={handleBranchChange}>
                        <SelectTrigger><SelectValue placeholder={t("common.selectBranch", "Select branch")} /></SelectTrigger>
                        <SelectContent>
                          {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("common.site", "Site")}</Label>
                  <Controller
                    name="site_id"
                    control={form.control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!watchedBranchId}
                      >
                        <SelectTrigger><SelectValue placeholder={t("common.selectSite", "Select site")} /></SelectTrigger>
                        <SelectContent>
                          {filteredSites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("common.department", "Department")}</Label>
                <Controller
                  name="department_id"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!watchedBranchId}
                    >
                      <SelectTrigger><SelectValue placeholder={t("common.selectDepartment", "Select department")} /></SelectTrigger>
                      <SelectContent>
                        {filteredDepartments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("contractors.projects.code", "Project Code")} *</Label>
                  <Input {...form.register("project_code")} />
                  {form.formState.errors.project_code && <span className="text-destructive text-sm">{form.formState.errors.project_code.message}</span>}
                </div>
                <div className="space-y-2">
                  <Label>{t("contractors.projects.name", "Project Name")} *</Label>
                  <Input {...form.register("project_name")} />
                  {form.formState.errors.project_name && <span className="text-destructive text-sm">{form.formState.errors.project_name.message}</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("contractors.projects.startDate", "Start Date")} *</Label>
                  <Input type="date" {...form.register("start_date")} />
                  {form.formState.errors.start_date && <span className="text-destructive text-sm">{form.formState.errors.start_date.message}</span>}
                </div>
                <div className="space-y-2">
                  <Label>{t("contractors.projects.endDate", "End Date")} *</Label>
                  <Input type="date" {...form.register("end_date")} />
                  {form.formState.errors.end_date && <span className="text-destructive text-sm">{form.formState.errors.end_date.message}</span>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("contractors.projects.notes", "Notes")}</Label>
                <Textarea {...form.register("notes")} />
              </div>
            </TabsContent>

            <TabsContent value="location" className="space-y-4 mt-4">
              {showMap ? (
                <Controller
                  name="latitude"
                  control={form.control}
                  render={({ field: latField }) => (
                    <Controller
                      name="longitude"
                      control={form.control}
                      render={({ field: lngField }) => (
                        <Controller
                          name="boundary_polygon"
                          control={form.control}
                          render={({ field: polyField }) => (
                            <Controller
                              name="geofence_radius_meters"
                              control={form.control}
                              render={({ field: radiusField }) => (
                                <LocationBoundaryPicker
                                  latitude={latField.value}
                                  longitude={lngField.value}
                                  boundaryPolygon={polyField.value}
                                  geofenceRadius={radiusField.value}
                                  onLocationChange={(lat, lng) => {
                                    latField.onChange(lat);
                                    lngField.onChange(lng);
                                  }}
                                  onPolygonChange={polyField.onChange}
                                  onRadiusChange={radiusField.onChange}
                                  title={t("contractors.projects.projectLocation", "Project Location")}
                                />
                              )}
                            />
                          )}
                        />
                      )}
                    />
                  )}
                />
              ) : (
                <div className="h-[400px] rounded-lg border bg-muted/30 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              <div className="space-y-2">
                <Label>{t("contractors.projects.locationDescription", "Location Description")}</Label>
                <Textarea
                  {...form.register("location_description")}
                  placeholder={t("contractors.projects.locationDescriptionPlaceholder", "Additional location details...")}
                  rows={2}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", "Cancel")}</Button>
            <Button type="submit" disabled={createProject.isPending || updateProject.isPending}>
              {(createProject.isPending || updateProject.isPending) && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isEditing ? t("common.save", "Save") : t("common.create", "Create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
