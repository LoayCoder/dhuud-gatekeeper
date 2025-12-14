import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { ContractorProject, useCreateContractorProject, useUpdateContractorProject } from "@/hooks/contractor-management/use-contractor-projects";
import { useContractorCompanies } from "@/hooks/contractor-management/use-contractor-companies";

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
  const isEditing = !!project;

  const [formData, setFormData] = useState({
    company_id: "", project_code: "", project_name: "", project_name_ar: "",
    start_date: "", end_date: "", location_description: "", notes: "",
  });

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
      });
    } else {
      setFormData({ company_id: "", project_code: "", project_name: "", project_name_ar: "", start_date: "", end_date: "", location_description: "", notes: "" });
    }
  }, [project, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      await updateProject.mutateAsync({ id: project.id, data: formData });
    } else {
      await createProject.mutateAsync(formData);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("contractors.projects.editProject", "Edit Project") : t("contractors.projects.addProject", "Add Project")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("contractors.projects.company", "Company")} *</Label>
            <Select value={formData.company_id} onValueChange={(v) => setFormData({ ...formData, company_id: v })} disabled={isEditing}>
              <SelectTrigger><SelectValue placeholder={t("contractors.projects.selectCompany", "Select company")} /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
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
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", "Cancel")}</Button>
            <Button type="submit" disabled={createProject.isPending || updateProject.isPending}>
              {isEditing ? t("common.save", "Save") : t("common.create", "Create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
