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
    project_id: "",
    company_id: "",
    pass_type: "material_in",
    material_description: "",
    quantity: "",
    vehicle_plate: "",
    driver_name: "",
    driver_mobile: "",
    pass_date: new Date().toISOString().split("T")[0],
    time_window_start: "",
    time_window_end: "",
  });

  const handleProjectChange = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    setFormData({
      ...formData,
      project_id: projectId,
      company_id: project?.company_id || "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPass.mutateAsync({
      project_id: formData.project_id,
      company_id: formData.company_id,
      pass_type: formData.pass_type,
      material_description: formData.material_description,
      quantity: formData.quantity || undefined,
      vehicle_plate: formData.vehicle_plate || undefined,
      driver_name: formData.driver_name || undefined,
      driver_mobile: formData.driver_mobile || undefined,
      pass_date: formData.pass_date,
      time_window_start: formData.time_window_start || undefined,
      time_window_end: formData.time_window_end || undefined,
    });
    setFormData({
      project_id: "", company_id: "", pass_type: "material_in", material_description: "",
      quantity: "", vehicle_plate: "", driver_name: "", driver_mobile: "",
      pass_date: new Date().toISOString().split("T")[0], time_window_start: "", time_window_end: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("contractors.gatePasses.createPass", "Create Gate Pass")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("contractors.gatePasses.project", "Project")} *</Label>
            <Select value={formData.project_id} onValueChange={handleProjectChange}>
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
                <SelectItem value="equipment_in">{t("contractors.gatePasses.equipmentIn", "Equipment In")}</SelectItem>
                <SelectItem value="equipment_out">{t("contractors.gatePasses.equipmentOut", "Equipment Out")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("contractors.gatePasses.material", "Material Description")} *</Label>
            <Textarea 
              value={formData.material_description} 
              onChange={(e) => setFormData({ ...formData, material_description: e.target.value })} 
              required 
              placeholder={t("contractors.gatePasses.materialPlaceholder", "Describe the materials or equipment...")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("contractors.gatePasses.quantity", "Quantity")}</Label>
              <Input 
                value={formData.quantity} 
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} 
                placeholder="e.g., 100 bags"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("contractors.gatePasses.vehiclePlate", "Vehicle Plate")}</Label>
              <Input 
                value={formData.vehicle_plate} 
                onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })} 
                placeholder="e.g., ABC 1234"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("contractors.gatePasses.driverName", "Driver Name")}</Label>
              <Input 
                value={formData.driver_name} 
                onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>{t("contractors.gatePasses.driverMobile", "Driver Mobile")}</Label>
              <Input 
                value={formData.driver_mobile} 
                onChange={(e) => setFormData({ ...formData, driver_mobile: e.target.value })} 
                placeholder="+966..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("contractors.gatePasses.passDate", "Pass Date")} *</Label>
            <Input 
              type="date" 
              value={formData.pass_date} 
              onChange={(e) => setFormData({ ...formData, pass_date: e.target.value })} 
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("contractors.gatePasses.timeWindowStart", "Time Window Start")}</Label>
              <Input 
                type="time" 
                value={formData.time_window_start} 
                onChange={(e) => setFormData({ ...formData, time_window_start: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>{t("contractors.gatePasses.timeWindowEnd", "Time Window End")}</Label>
              <Input 
                type="time" 
                value={formData.time_window_end} 
                onChange={(e) => setFormData({ ...formData, time_window_end: e.target.value })} 
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={createPass.isPending || !formData.project_id || !formData.material_description}>
              {t("common.create", "Create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
