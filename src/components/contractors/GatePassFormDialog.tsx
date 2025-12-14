import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useCreateGatePass } from "@/hooks/contractor-management/use-material-gate-passes";
import { ContractorProject } from "@/hooks/contractor-management/use-contractor-projects";

interface GatePassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ContractorProject[];
}

export function GatePassFormDialog({ open, onOpenChange, projects }: GatePassFormDialogProps) {
  const { t } = useTranslation();
  const createPass = useCreateGatePass();

  const [formData, setFormData] = useState({
    project_id: "", pass_type: "material_in", material_description: "",
    quantity: "", vehicle_number: "", driver_name: "", expected_date: "", expected_time: "", notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPass.mutateAsync(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("contractors.gatePasses.createPass", "Create Gate Pass")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("contractors.gatePasses.project", "Project")} *</Label>
            <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
              <SelectTrigger><SelectValue placeholder={t("contractors.gatePasses.selectProject", "Select project")} /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("contractors.gatePasses.type", "Pass Type")} *</Label>
            <Select value={formData.pass_type} onValueChange={(v) => setFormData({ ...formData, pass_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="material_in">{t("contractors.gatePasses.materialIn", "Material In")}</SelectItem>
                <SelectItem value="material_out">{t("contractors.gatePasses.materialOut", "Material Out")}</SelectItem>
                <SelectItem value="equipment">{t("contractors.gatePasses.equipment", "Equipment")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("contractors.gatePasses.material", "Material Description")} *</Label>
            <Textarea value={formData.material_description} onChange={(e) => setFormData({ ...formData, material_description: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("contractors.gatePasses.vehicle", "Vehicle Number")}</Label>
              <Input value={formData.vehicle_number} onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("contractors.gatePasses.driver", "Driver Name")}</Label>
              <Input value={formData.driver_name} onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("contractors.gatePasses.date", "Expected Date")} *</Label>
              <Input type="date" value={formData.expected_date} onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>{t("contractors.gatePasses.time", "Expected Time")}</Label>
              <Input type="time" value={formData.expected_time} onChange={(e) => setFormData({ ...formData, expected_time: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", "Cancel")}</Button>
            <Button type="submit" disabled={createPass.isPending}>{t("common.create", "Create")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
