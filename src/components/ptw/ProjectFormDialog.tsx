import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSites } from "@/hooks/use-sites";
import { useCreatePTWProject } from "@/hooks/ptw";
import { useContractorCompanies } from "@/hooks/contractor-management";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectFormDialog({ open, onOpenChange }: ProjectFormDialogProps) {
  const { t } = useTranslation();
  const { data: sites, isLoading: sitesLoading } = useSites();
  const { data: contractors, isLoading: contractorsLoading } = useContractorCompanies();
  const createProject = useCreatePTWProject();

  const [formData, setFormData] = useState({
    name: "",
    name_ar: "",
    description: "",
    site_id: "",
    contractor_company_id: "",
    start_date: "",
    end_date: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
        contractor_company_id: formData.contractor_company_id || undefined,
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
      start_date: "",
      end_date: "",
    });
    setErrors({});
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("ptw.mobilization.newProject", "New Project")}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Site Selection */}
          <div className="space-y-2">
            <Label htmlFor="site_id">
              {t("ptw.project.site", "Site")}
            </Label>
            <Select
              value={formData.site_id}
              onValueChange={(value) => setFormData({ ...formData, site_id: value })}
            >
              <SelectTrigger id="site_id">
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

          {/* Contractor Selection */}
          <div className="space-y-2">
            <Label htmlFor="contractor_company_id">
              {t("ptw.project.contractor", "Contractor Company")}
            </Label>
            <Select
              value={formData.contractor_company_id}
              onValueChange={(value) => setFormData({ ...formData, contractor_company_id: value })}
            >
              <SelectTrigger id="contractor_company_id">
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
