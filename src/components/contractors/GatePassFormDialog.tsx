import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef } from "react";
import { useCreateGatePass } from "@/hooks/contractor-management/use-material-gate-passes";
import { ContractorProject } from "@/hooks/contractor-management/use-contractor-projects";
import { Plus, Trash2, Upload, X, ImageIcon } from "lucide-react";
import { compressImage } from "@/lib/upload-utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface GatePassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ContractorProject[];
}

interface GatePassItem {
  id: string;
  item_name: string;
  description: string;
  quantity: string;
  unit: string;
}

const UNIT_OPTIONS = [
  { value: "pcs", label: "Pieces" },
  { value: "bags", label: "Bags" },
  { value: "boxes", label: "Boxes" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "tons", label: "Tons" },
  { value: "liters", label: "Liters" },
  { value: "meters", label: "Meters" },
  { value: "sqm", label: "Square Meters (m²)" },
  { value: "rolls", label: "Rolls" },
  { value: "sheets", label: "Sheets" },
  { value: "pallets", label: "Pallets" },
  { value: "drums", label: "Drums" },
  { value: "cylinders", label: "Cylinders" },
  { value: "sets", label: "Sets" },
  { value: "units", label: "Units" },
];

const createEmptyItem = (): GatePassItem => ({
  id: crypto.randomUUID(),
  item_name: "",
  description: "",
  quantity: "",
  unit: "",
});

export function GatePassFormDialog({ open, onOpenChange, projects }: GatePassFormDialogProps) {
  const { t } = useTranslation();
  const createPass = useCreateGatePass();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    project_id: "",
    company_id: "",
    pass_type: "material_in",
    vehicle_plate: "",
    driver_name: "",
    driver_mobile: "",
    pass_date: new Date().toISOString().split("T")[0],
    time_window_start: "",
    time_window_end: "",
  });

  const [items, setItems] = useState<GatePassItem[]>([createEmptyItem()]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  const handleProjectChange = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    setFormData({
      ...formData,
      project_id: projectId,
      company_id: project?.company_id || "",
    });
  };

  const handleAddItem = () => {
    setItems([...items, createEmptyItem()]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof GatePassItem, value: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 3 - photos.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    for (const file of filesToAdd) {
      try {
        const compressed = await compressImage(file, 1920, 0.8);
        setPhotos((prev) => [...prev, compressed]);
        const previewUrl = URL.createObjectURL(compressed);
        setPhotoPreviewUrls((prev) => [...prev, previewUrl]);
      } catch {
        // If compression fails, use original
        setPhotos((prev) => [...prev, file]);
        const previewUrl = URL.createObjectURL(file);
        setPhotoPreviewUrls((prev) => [...prev, previewUrl]);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormData({
      project_id: "",
      company_id: "",
      pass_type: "material_in",
      vehicle_plate: "",
      driver_name: "",
      driver_mobile: "",
      pass_date: new Date().toISOString().split("T")[0],
      time_window_start: "",
      time_window_end: "",
    });
    setItems([createEmptyItem()]);
    photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPhotos([]);
    setPhotoPreviewUrls([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter((item) => item.item_name.trim() !== "");
    if (validItems.length === 0) return;

    await createPass.mutateAsync({
      project_id: formData.project_id,
      company_id: formData.company_id,
      pass_type: formData.pass_type,
      vehicle_plate: formData.vehicle_plate || undefined,
      driver_name: formData.driver_name || undefined,
      driver_mobile: formData.driver_mobile || undefined,
      pass_date: formData.pass_date,
      time_window_start: formData.time_window_start || undefined,
      time_window_end: formData.time_window_end || undefined,
      items: validItems.map(({ item_name, description, quantity, unit }) => ({
        item_name,
        description: description || undefined,
        quantity: quantity || undefined,
        unit: unit || undefined,
      })),
      photos,
    });

    resetForm();
    onOpenChange(false);
  };

  const hasValidItem = items.some((item) => item.item_name.trim() !== "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("contractors.gatePasses.createPass", "Create Gate Pass")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project & Pass Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("contractors.gatePasses.project", "Project")} *</Label>
              <Select value={formData.project_id} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("contractors.gatePasses.selectProject", "Select project")} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("contractors.gatePasses.type", "Pass Type")} *</Label>
              <Select value={formData.pass_type} onValueChange={(v) => setFormData({ ...formData, pass_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="material_in">{t("contractors.gatePasses.materialIn", "Material In")}</SelectItem>
                  <SelectItem value="material_out">{t("contractors.gatePasses.materialOut", "Material Out")}</SelectItem>
                  <SelectItem value="equipment_in">{t("contractors.gatePasses.equipmentIn", "Equipment In")}</SelectItem>
                  <SelectItem value="equipment_out">{t("contractors.gatePasses.equipmentOut", "Equipment Out")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <Label>{t("contractors.gatePasses.items", "Items")} *</Label>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-center">SR#</TableHead>
                    <TableHead className="w-[180px]">{t("contractors.gatePasses.itemName", "Item Name")} *</TableHead>
                    <TableHead>{t("contractors.gatePasses.description", "Description")}</TableHead>
                    <TableHead className="w-[80px]">{t("contractors.gatePasses.quantity", "Qty")}</TableHead>
                    <TableHead className="w-[140px]">{t("contractors.gatePasses.unit", "Unit")}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-center font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          value={item.item_name}
                          onChange={(e) => handleItemChange(item.id, "item_name", e.target.value)}
                          placeholder={t("contractors.gatePasses.itemNamePlaceholder", "e.g., Cement")}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                          placeholder={t("contractors.gatePasses.descriptionPlaceholder", "e.g., 50kg bags")}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, "quantity", e.target.value)}
                          placeholder="100"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.unit}
                          onValueChange={(v) => handleItemChange(item.id, "unit", v)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={t("contractors.gatePasses.selectUnit", "Select")} />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_OPTIONS.map((unit) => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {t(`contractors.gatePasses.units.${unit.value}`, unit.label)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={items.length === 1}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="mt-2">
              <Plus className="h-4 w-4 me-1" />
              {t("contractors.gatePasses.addItem", "Add Item")}
            </Button>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label>
              {t("contractors.gatePasses.photos", "Photos")} ({photos.length}/3)
            </Label>
            <div className="flex flex-wrap gap-3">
              {photoPreviewUrls.map((url, index) => (
                <div key={index} className="relative w-20 h-20 rounded-md overflow-hidden border">
                  <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-1 end-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 border-2 border-dashed rounded-md flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-xs mt-1">{t("contractors.gatePasses.addPhoto", "Add")}</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">
              {t("contractors.gatePasses.maxPhotos", "Max 3 photos. Images will be compressed automatically.")}
            </p>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("contractors.gatePasses.passDate", "Pass Date")} *</Label>
              <Input
                type="date"
                value={formData.pass_date}
                onChange={(e) => setFormData({ ...formData, pass_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t("contractors.gatePasses.timeWindowStart", "Time From")}</Label>
              <Input
                type="time"
                value={formData.time_window_start}
                onChange={(e) => setFormData({ ...formData, time_window_start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("contractors.gatePasses.timeWindowEnd", "Time To")}</Label>
              <Input
                type="time"
                value={formData.time_window_end}
                onChange={(e) => setFormData({ ...formData, time_window_end: e.target.value })}
              />
            </div>
          </div>

          {/* Vehicle & Driver */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("contractors.gatePasses.vehiclePlate", "Vehicle Plate")}</Label>
              <Input
                value={formData.vehicle_plate}
                onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                placeholder="e.g., ABC 1234"
              />
            </div>
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

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={createPass.isPending || !formData.project_id || !hasValidItem}>
              {t("common.create", "Create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
