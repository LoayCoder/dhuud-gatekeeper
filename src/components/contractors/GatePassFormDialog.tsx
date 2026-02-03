import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef, useEffect } from "react";
import { useCreateGatePass } from "@/hooks/contractor-management/use-material-gate-passes";
import { useEmployeeApprovers } from "@/hooks/contractor-management/use-gate-pass-approvers";
import { useGatePassTypes } from "@/hooks/contractor-management/use-gate-pass-types";
import { useCachedProfile } from "@/hooks/use-cached-profile";
import { ContractorProject } from "@/hooks/contractor-management/use-contractor-projects";
import { Plus, Trash2, X, ImageIcon, User, Building2 } from "lucide-react";
import { compressImage } from "@/lib/upload-utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GatePassItemPhotoUpload } from "./GatePassItemPhotoUpload";

interface GatePassFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ContractorProject[];
  canCreateInternal?: boolean;
  canCreateExternal?: boolean;
}

interface GatePassItem {
  id: string;
  item_name: string;
  description: string;
  quantity: string;
  unit: string;
  photos: File[];
  photoPreviewUrls: string[];
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
  photos: [],
  photoPreviewUrls: [],
});

export function GatePassFormDialog({ 
  open, 
  onOpenChange, 
  projects,
  canCreateInternal = false,
  canCreateExternal = false,
}: GatePassFormDialogProps) {
  const { t, i18n } = useTranslation();
  const createPass = useCreateGatePass();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get user profile to determine if internal user
  const { data: profile } = useCachedProfile();
  
  // User can create internal if they have permission AND are an employee
  const isInternalUser = profile?.user_type === 'employee' && canCreateInternal;
  
  // Fetch employee approvers for internal requests
  const { data: employeeApprovers = [] } = useEmployeeApprovers();
  
  // Determine scope for pass types based on request type
  const [isInternalScope, setIsInternalScope] = useState(false);
  const passTypeScope = isInternalScope ? "internal" : "external";
  const { data: passTypes = [] } = useGatePassTypes(passTypeScope);
  
  // Determine if current language is Arabic
  const isArabic = i18n.language === 'ar';

  const today = getToday();
  const [formData, setFormData] = useState({
    project_id: "",
    company_id: "",
    pass_type: "material_in",
    vehicle_plate: "",
    driver_name: "",
    driver_mobile: "",
    start_date: today,
    end_date: today,
    time_window_start: "",
    time_window_end: "",
    approval_from_id: "", // For internal requests
  });

  const [selectedProject, setSelectedProject] = useState<ContractorProject | null>(null);
  const [items, setItems] = useState<GatePassItem[]>([createEmptyItem()]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  const handleProjectChange = (projectId: string) => {
    // Treat "_none_" as empty (no project selected)
    const actualProjectId = projectId === "_none_" ? "" : projectId;
    const project = actualProjectId ? projects.find((p) => p.id === actualProjectId) : null;
    setSelectedProject(project || null);
    
    // Update internal scope based on project selection
    const newIsInternalScope = isInternalUser && !actualProjectId;
    setIsInternalScope(newIsInternalScope);
    
    setFormData({
      ...formData,
      project_id: actualProjectId,
      company_id: project?.company_id || "",
      // Clear approver when project is selected
      approval_from_id: actualProjectId ? "" : formData.approval_from_id,
      // Reset pass type when scope changes
      pass_type: passTypes.length > 0 ? passTypes[0].code : "material_in",
    });
  };

  useEffect(() => {
    if (!open) {
      setSelectedProject(null);
    }
  }, [open]);

  const handleAddItem = () => {
    setItems([...items, createEmptyItem()]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      const itemToRemove = items.find((i) => i.id === id);
      itemToRemove?.photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof GatePassItem, value: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleItemPhotosChange = (id: string, photos: File[], previewUrls: string[]) => {
    setItems(
      items.map((item) =>
        item.id === id
          ? { ...item, photos, photoPreviewUrls: previewUrls }
          : item
      )
    );
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Only allow 1 photo per gate pass
    const file = files[0];

    // Clear existing photo first
    photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));

    let photoToSet = file;
    try {
      // Compress to 1280px max width with 0.75 quality for optimal size
      photoToSet = await compressImage(file, 1280, 0.75);
    } catch (err) {
      console.error("Image compression failed, using original file.", err);
    }

    setPhotos([photoToSet]);
    const previewUrl = URL.createObjectURL(photoToSet);
    setPhotoPreviewUrls([previewUrl]);

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
    const resetToday = getToday();
    setFormData({
      project_id: "",
      company_id: "",
      pass_type: "material_in",
      vehicle_plate: "",
      driver_name: "",
      driver_mobile: "",
      start_date: resetToday,
      end_date: resetToday,
      time_window_start: "",
      time_window_end: "",
      approval_from_id: "",
    });
    setSelectedProject(null);
    // Cleanup item photos
    items.forEach((item) => item.photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url)));
    setItems([createEmptyItem()]);
    // Cleanup global photos
    photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPhotos([]);
    setPhotoPreviewUrls([]);
  };

  // Date range validation using shared utilities
  const maxEndDate = calculateMaxEndDate(formData.start_date, 7);
  const dateRangeError = validateDateRange(formData.start_date, formData.end_date, 7, t);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter((item) => item.item_name.trim() !== "");
    if (validItems.length === 0) return;

    const mappedItems = validItems.map(({ item_name, description, quantity, unit, photos }) => ({
      item_name,
      description: description || undefined,
      quantity: quantity || undefined,
      unit: unit || undefined,
      photos,
    }));

    // Determine if this is an internal request (no project selected)
    const isInternalRequest = isInternalUser && !formData.project_id;

    // For external users or project-based requests: need PM
    // For internal requests: need approval_from_id
    if (!isInternalRequest) {
      const pmId = selectedProject?.project_manager_id;
      if (!pmId) return;

      await createPass.mutateAsync({
        project_id: formData.project_id,
        company_id: formData.company_id,
        pass_type: formData.pass_type,
        pm_approved_by: pmId,
        is_internal_request: false,
        vehicle_plate: formData.vehicle_plate || undefined,
        driver_name: formData.driver_name || undefined,
        driver_mobile: formData.driver_mobile || undefined,
        start_date: formData.start_date,
        end_date: formData.end_date,
        time_window_start: formData.time_window_start || undefined,
        time_window_end: formData.time_window_end || undefined,
        items: mappedItems,
        photos,
      });
    } else {
      // Internal request - needs approver selection
      if (!formData.approval_from_id) return;

      await createPass.mutateAsync({
        pass_type: formData.pass_type,
        approval_from_id: formData.approval_from_id,
        is_internal_request: true,
        vehicle_plate: formData.vehicle_plate || undefined,
        driver_name: formData.driver_name || undefined,
        driver_mobile: formData.driver_mobile || undefined,
        start_date: formData.start_date,
        end_date: formData.end_date,
        time_window_start: formData.time_window_start || undefined,
        time_window_end: formData.time_window_end || undefined,
        items: mappedItems,
        photos,
      });
    }

    resetForm();
    onOpenChange(false);
  };

  const hasValidItem = items.some((item) => item.item_name.trim() !== "");
  const hasProjectManager = !!selectedProject?.project_manager_id;

  // Determine if internal request mode (employee with no project selected)
  const isInternalRequestMode = isInternalUser && !formData.project_id;

  // Can submit if:
  // 1. Has valid items AND
  // 2. Either has project with PM OR is internal request with approver
  // 3. No date range errors
  const canSubmit = hasValidItem && !dateRangeError && (
    (!isInternalRequestMode && hasProjectManager) ||
    (isInternalRequestMode && !!formData.approval_from_id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("contractors.gatePasses.createPass", "Create Gate Pass")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Internal Request Badge */}
          {isInternalRequestMode && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {t("contractors.gatePasses.internalRequest", "Internal Request")}
              </span>
              <Badge variant="secondary" className="text-xs">
                {t("contractors.gatePasses.noProjectRequired", "No Project Required")}
              </Badge>
            </div>
          )}

          {/* Project & Pass Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {t("contractors.gatePasses.project", "Project")}
                {!isInternalUser && " *"}
                {isInternalUser && (
                  <span className="text-muted-foreground text-xs ms-1">
                    ({t("common.optional", "Optional")})
                  </span>
                )}
              </Label>
              <Select 
                value={formData.project_id || (isInternalUser ? "_none_" : "")} 
                onValueChange={handleProjectChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("contractors.gatePasses.selectProject", "Select project")} />
                </SelectTrigger>
                <SelectContent>
                  {isInternalUser && (
                    <SelectItem value="_none_">
                      <span className="text-muted-foreground">
                        {t("contractors.gatePasses.noProject", "-- No Project (Internal) --")}
                      </span>
                    </SelectItem>
                  )}
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
                  <SelectValue placeholder={t("contractors.gatePasses.selectPassType", "Select pass type")} />
                </SelectTrigger>
                <SelectContent>
                  {passTypes.length > 0 ? (
                    passTypes.map((pt) => (
                      <SelectItem key={pt.id} value={pt.code}>
                        {isArabic && pt.name_ar ? pt.name_ar : pt.name}
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="material_in">{t("contractors.gatePasses.materialIn", "Material In")}</SelectItem>
                      <SelectItem value="material_out">{t("contractors.gatePasses.materialOut", "Material Out")}</SelectItem>
                      <SelectItem value="equipment_in">{t("contractors.gatePasses.equipmentIn", "Equipment In")}</SelectItem>
                      <SelectItem value="equipment_out">{t("contractors.gatePasses.equipmentOut", "Equipment Out")}</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project Manager (Auto-selected, Read-only) - shown when project is selected */}
          {selectedProject && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-primary" />
                <span className="font-medium">{t("contractors.gatePasses.approvalFrom", "Approval From")}:</span>
                {selectedProject.project_manager ? (
                  <span className="text-foreground">{selectedProject.project_manager.full_name}</span>
                ) : (
                  <span className="text-destructive">{t("contractors.gatePasses.noProjectManager", "No project manager assigned")}</span>
                )}
              </div>
              {!hasProjectManager && (
                <p className="text-xs text-destructive mt-1">
                  {t("contractors.gatePasses.assignPMFirst", "Please assign a project manager to this project first.")}
                </p>
              )}
            </div>
          )}

          {/* Approver Selection - shown for internal requests without project */}
          {isInternalRequestMode && (
            <div className="space-y-2">
              <Label>{t("contractors.gatePasses.selectApprover", "Select Approver")} *</Label>
              <Select 
                value={formData.approval_from_id} 
                onValueChange={(v) => setFormData({ ...formData, approval_from_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("contractors.gatePasses.selectApproverPlaceholder", "Select an approver")} />
                </SelectTrigger>
                <SelectContent>
                  {employeeApprovers.map((approver) => (
                    <SelectItem key={approver.id} value={approver.id}>
                      <div className="flex items-center gap-2">
                        <span>{approver.full_name}</span>
                        {approver.job_title && (
                          <span className="text-muted-foreground text-xs">({approver.job_title})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t("contractors.gatePasses.internalApproverNote", "For internal requests, select a manager or supervisor to approve this gate pass.")}
              </p>
            </div>
          )}

          {/* Items Table */}
          <div className="space-y-2">
            <Label>{t("contractors.gatePasses.items", "Items")} *</Label>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px] text-center">SR#</TableHead>
                    <TableHead className="min-w-[150px]">{t("contractors.gatePasses.itemName", "Item Name")} *</TableHead>
                    <TableHead className="min-w-[150px]">{t("contractors.gatePasses.description", "Description")}</TableHead>
                    <TableHead className="w-[80px]">{t("contractors.gatePasses.quantity", "Qty")}</TableHead>
                    <TableHead className="w-[120px]">{t("contractors.gatePasses.unit", "Unit")}</TableHead>
                    <TableHead className="min-w-[140px]">{t("contractors.gatePasses.photos", "Photos")}</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
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
                        <GatePassItemPhotoUpload
                          photos={item.photos}
                          photoPreviewUrls={item.photoPreviewUrls}
                          onPhotosChange={(photos, urls) => handleItemPhotosChange(item.id, photos, urls)}
                          maxPhotos={3}
                        />
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

          {/* Photo - Single compressed photo */}
          <div className="space-y-2">
            <Label>
              {t("contractors.gatePasses.generalDocuments", "General Documents (Optional)")} ({photos.length}/3)
            </Label>
            <div className="flex flex-wrap gap-3">
              {photoPreviewUrls.map((url, index) => (
                <div key={index} className="relative w-24 h-24 rounded-md overflow-hidden border">
                  <img src={url} alt={t("contractors.gatePasses.attachedPhoto", "Attached photo")} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-1 end-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length === 0 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 border-2 border-dashed rounded-md flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
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
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">
              {t("contractors.gatePasses.singlePhotoNote", "Single photo. Image will be compressed automatically.")}
            </p>
          </div>

          {/* Date Range & Time */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("contractors.gatePasses.startDate", "Start Date")} *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  min={today}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    const newEndDate = adjustEndDateForStartChange(newStartDate, formData.end_date, 7);
                    setFormData({ ...formData, start_date: newStartDate, end_date: newEndDate });
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("contractors.gatePasses.endDate", "End Date")} *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  min={formData.start_date}
                  max={maxEndDate}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>
            {dateRangeError && (
              <p className="text-xs text-destructive">{dateRangeError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t("contractors.gatePasses.dateRangeNote", "Pass validity can span up to 7 days maximum.")}
            </p>

            {/* Time Window */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {t("contractors.gatePasses.timeWindowStart", "Time From")}
                  <span className="text-muted-foreground text-xs ms-1">
                    ({t("common.optional", "Optional")})
                  </span>
                </Label>
                <Input
                  type="time"
                  value={formData.time_window_start}
                  onChange={(e) => setFormData({ ...formData, time_window_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {t("contractors.gatePasses.timeWindowEnd", "Time To")}
                  <span className="text-muted-foreground text-xs ms-1">
                    ({t("common.optional", "Optional")})
                  </span>
                </Label>
                <Input
                  type="time"
                  value={formData.time_window_end}
                  onChange={(e) => setFormData({ ...formData, time_window_end: e.target.value })}
                />
              </div>
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
            <Button type="submit" disabled={createPass.isPending || !canSubmit}>
              {t("common.create", "Create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
