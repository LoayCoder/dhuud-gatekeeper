import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useSites } from "@/hooks/use-sites";
import { useCreatePTWProject } from "@/hooks/ptw";
import { useContractorCompanies, useContractorProjects } from "@/hooks/contractor-management";
import { toast } from "sonner";
import { Loader2, Link2, X, Building2, Users } from "lucide-react";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectFormDialog({ open, onOpenChange }: ProjectFormDialogProps) {
  const { t } = useTranslation();
  const { data: sites } = useSites();
  const { data: contractors } = useContractorCompanies();
  const { data: contractorProjects } = useContractorProjects({ status: "active" });
  const createProject = useCreatePTWProject();

  const [formData, setFormData] = useState({
    name: "",
    name_ar: "",
    description: "",
    site_id: "",
    contractor_company_id: "",
    linked_contractor_project_id: "",
    is_internal_work: false,
    start_date: "",
    end_date: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLinkedFieldsLocked, setIsLinkedFieldsLocked] = useState(false);

  // Handle contractor project selection - auto-populate fields
  useEffect(() => {
    if (!formData.is_internal_work && formData.linked_contractor_project_id && contractorProjects) {
      const linkedProject = contractorProjects.find(
        (p) => p.id === formData.linked_contractor_project_id
      );
      
      if (linkedProject) {
        setFormData((prev) => ({
          ...prev,
          contractor_company_id: linkedProject.company_id,
          site_id: linkedProject.site_id || "",
        }));
        setIsLinkedFieldsLocked(true);
      }
    } else {
      setIsLinkedFieldsLocked(false);
    }
  }, [formData.linked_contractor_project_id, formData.is_internal_work, contractorProjects]);

  // Clear contractor fields when switching to internal work
  useEffect(() => {
    if (formData.is_internal_work) {
      setFormData((prev) => ({
        ...prev,
        linked_contractor_project_id: "",
        contractor_company_id: "",
      }));
      setIsLinkedFieldsLocked(false);
    }
  }, [formData.is_internal_work]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = t("validation.required", "This field is required");
    } else if (formData.name.length > 200) {
      newErrors.name = t("validation.maxLength", "Maximum {{max}} characters", { max: 200 });
    }
    
    if (!formData.start_date) {
      newErrors.start_date = t("validation.required", "This field is required");
    }
    
    if (!formData.end_date) {
      newErrors.end_date = t("validation.required", "This field is required");
    }
    
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = t("validation.endAfterStart", "End date must be after start date");
    }

    // Contractor project is mandatory for non-internal work
    if (!formData.is_internal_work && !formData.linked_contractor_project_id) {
      newErrors.linked_contractor_project_id = t("validation.required", "This field is required");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await createProject.mutateAsync({
        name: formData.name.trim(),
        name_ar: formData.name_ar.trim() || undefined,
        description: formData.description.trim() || undefined,
        site_id: formData.site_id || undefined,
        contractor_company_id: formData.is_internal_work ? undefined : formData.contractor_company_id || undefined,
        linked_contractor_project_id: formData.is_internal_work ? undefined : formData.linked_contractor_project_id || undefined,
        is_internal_work: formData.is_internal_work,
        start_date: formData.start_date,
        end_date: formData.end_date,
      });
      
      toast.success(t("ptw.project.created", "Project created successfully"));
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error(t("ptw.project.createError", "Failed to create project"));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      name_ar: "",
      description: "",
      site_id: "",
      contractor_company_id: "",
      linked_contractor_project_id: "",
      is_internal_work: false,
      start_date: "",
      end_date: "",
    });
    setErrors({});
    setIsLinkedFieldsLocked(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const handleClearLinkedProject = () => {
    setFormData((prev) => ({
      ...prev,
      linked_contractor_project_id: "",
      contractor_company_id: "",
      site_id: "",
    }));
    setIsLinkedFieldsLocked(false);
  };

  const selectedLinkedProject = contractorProjects?.find(
    (p) => p.id === formData.linked_contractor_project_id
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("ptw.mobilization.newProject", "New Project")}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Work Type Toggle */}
          <div className="space-y-3">
            <Label className="text-base font-medium">
              {t("ptw.project.workType", "Work Type")}
            </Label>
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-3">
                {formData.is_internal_work ? (
                  <Users className="h-5 w-5 text-primary" />
                ) : (
                  <Building2 className="h-5 w-5 text-primary" />
                )}
                <div>
                  <p className="font-medium">
                    {formData.is_internal_work 
                      ? t("ptw.project.internalWork", "Internal Work")
                      : t("ptw.project.contractorWork", "Contractor Work")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formData.is_internal_work 
                      ? t("ptw.project.internalWorkDesc", "Only internal team members involved")
                      : t("ptw.project.contractorWorkDesc", "External contractor involvement required")}
                  </p>
                </div>
              </div>
              <Switch
                checked={formData.is_internal_work}
                onCheckedChange={(checked) => setFormData({ ...formData, is_internal_work: checked })}
              />
            </div>
          </div>

          {/* Contractor Project Selection - Only for contractor work */}
          {!formData.is_internal_work && (
            <div className="space-y-2">
              <Label htmlFor="linked_contractor_project_id" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                {t("ptw.project.linkToContractor", "Link to Contractor Project")}
                <span className="text-destructive">*</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("ptw.project.linkMandatoryText", "Select a contractor project to auto-populate company and site")}
              </p>
              
              {selectedLinkedProject ? (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Link2 className="h-3 w-3" />
                    {selectedLinkedProject.project_code}
                  </Badge>
                  <span className="text-sm flex-1">{selectedLinkedProject.project_name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearLinkedProject}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Select
                  value={formData.linked_contractor_project_id}
                  onValueChange={(value) => setFormData({ ...formData, linked_contractor_project_id: value })}
                >
                  <SelectTrigger id="linked_contractor_project_id" className={errors.linked_contractor_project_id ? "border-destructive" : ""}>
                    <SelectValue placeholder={t("ptw.project.selectContractorProject", "Select contractor project")} />
                  </SelectTrigger>
                  <SelectContent>
                    {contractorProjects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <span className="font-medium">{project.project_code}</span>
                        <span className="text-muted-foreground ms-2">- {project.project_name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.linked_contractor_project_id && (
                <p className="text-sm text-destructive">{errors.linked_contractor_project_id}</p>
              )}
            </div>
          )}

          {/* Internal Work Info Banner */}
          {formData.is_internal_work && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Users className="h-5 w-5 text-primary flex-shrink-0" />
              <p className="text-sm text-primary">
                {t("ptw.project.internalOnlyNote", "This project is for internal team only - no contractor involvement required")}
              </p>
            </div>
          )}

          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              {t("ptw.project.name", "Project Name")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("ptw.project.namePlaceholder", "Enter project name")}
              maxLength={200}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Arabic Name */}
          <div className="space-y-2">
            <Label htmlFor="name_ar">
              {t("ptw.project.nameAr", "Project Name (Arabic)")}
            </Label>
            <Input
              id="name_ar"
              dir="rtl"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              placeholder={t("ptw.project.nameArPlaceholder", "اسم المشروع")}
              maxLength={200}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {t("ptw.project.description", "Description")}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t("ptw.project.descriptionPlaceholder", "Brief project description...")}
              rows={3}
              maxLength={1000}
            />
          </div>

          {/* Site Selection - Always visible */}
          <div className="space-y-2">
            <Label htmlFor="site_id" className="flex items-center gap-2">
              {t("ptw.project.site", "Site")}
              {isLinkedFieldsLocked && (
                <Badge variant="outline" className="text-xs">
                  {t("ptw.project.autoPopulated", "Auto-populated")}
                </Badge>
              )}
            </Label>
            <Select
              value={formData.site_id}
              onValueChange={(value) => setFormData({ ...formData, site_id: value })}
              disabled={isLinkedFieldsLocked}
            >
              <SelectTrigger id="site_id" className={isLinkedFieldsLocked ? "opacity-60" : ""}>
                <SelectValue placeholder={t("ptw.project.selectSite", "Select site")} />
              </SelectTrigger>
              <SelectContent>
                {sites?.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contractor Selection - Only for contractor work */}
          {!formData.is_internal_work && (
            <div className="space-y-2">
              <Label htmlFor="contractor_company_id" className="flex items-center gap-2">
                {t("ptw.project.contractor", "Contractor Company")}
                {isLinkedFieldsLocked && (
                  <Badge variant="outline" className="text-xs">
                    {t("ptw.project.autoPopulated", "Auto-populated")}
                  </Badge>
                )}
              </Label>
              <Select
                value={formData.contractor_company_id}
                onValueChange={(value) => setFormData({ ...formData, contractor_company_id: value })}
                disabled={isLinkedFieldsLocked}
              >
                <SelectTrigger id="contractor_company_id" className={isLinkedFieldsLocked ? "opacity-60" : ""}>
                  <SelectValue placeholder={t("ptw.project.selectContractor", "Select contractor")} />
                </SelectTrigger>
                <SelectContent>
                  {contractors?.map((contractor) => (
                    <SelectItem key={contractor.id} value={contractor.id}>
                      {contractor.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Range */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start_date">
                {t("ptw.project.startDate", "Start Date")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
              {errors.start_date && <p className="text-sm text-destructive">{errors.start_date}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">
                {t("ptw.project.endDate", "End Date")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
              {errors.end_date && <p className="text-sm text-destructive">{errors.end_date}</p>}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("ptw.project.create", "Create Project")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
