import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Trash2, Package, GripVertical, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { GatePassPhotoCapture } from "./GatePassPhotoCapture";

export interface GatePassItemData {
  id: string;
  item_name: string;
  description: string;
  quantity: string;
  unit: string;
  photos: File[];
  photoPreviewUrls: string[];
}

interface GatePassItemCardProps {
  item: GatePassItemData;
  index: number;
  onChange: (item: GatePassItemData) => void;
  onRemove: () => void;
  canRemove: boolean;
  disabled?: boolean;
  hasError?: boolean;
}

const UNIT_OPTIONS = [
  { value: "pieces", labelEn: "Pieces", labelAr: "قطعة" },
  { value: "bags", labelEn: "Bags", labelAr: "أكياس" },
  { value: "boxes", labelEn: "Boxes", labelAr: "صناديق" },
  { value: "kg", labelEn: "Kilograms", labelAr: "كيلوغرام" },
  { value: "tons", labelEn: "Tons", labelAr: "طن" },
  { value: "liters", labelEn: "Liters", labelAr: "لتر" },
  { value: "meters", labelEn: "Meters", labelAr: "متر" },
  { value: "rolls", labelEn: "Rolls", labelAr: "لفات" },
  { value: "pallets", labelEn: "Pallets", labelAr: "منصات" },
  { value: "sets", labelEn: "Sets", labelAr: "مجموعات" },
];

export function GatePassItemCard({
  item,
  index,
  onChange,
  onRemove,
  canRemove,
  disabled = false,
  hasError = false,
}: GatePassItemCardProps) {
  const { t, i18n } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const isRTL = i18n.dir() === "rtl";

  const updateField = (field: keyof GatePassItemData, value: string | File[] | string[]) => {
    onChange({ ...item, [field]: value });
  };

  const handlePhotosChange = (photos: File[], previewUrls: string[]) => {
    onChange({ ...item, photos, photoPreviewUrls: previewUrls });
  };

  const hasPhotos = item.photos.length > 0;
  const hasName = item.item_name.trim().length > 0;
  const isComplete = hasName && hasPhotos;
  const showPhotoError = hasError && !hasPhotos;

  return (
    <div
      className={cn(
        "rounded-xl border-2 bg-card overflow-hidden transition-all duration-200",
        hasError && !isComplete
          ? "border-destructive/50"
          : isComplete
          ? "border-success/50"
          : "border-border"
      )}
    >
      {/* Header - Always visible */}
      <div
        className={cn(
          "flex items-center gap-3 p-4 cursor-pointer select-none",
          "hover:bg-muted/50 transition-colors"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Drag handle */}
        <div className="text-muted-foreground/50">
          <GripVertical className="h-5 w-5" />
        </div>

        {/* Item number */}
        <div
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
            isComplete
              ? "bg-success/10 text-success"
              : hasError
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          )}
        >
          {index + 1}
        </div>

        {/* Item summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className={cn("font-medium truncate", !hasName && "text-muted-foreground")}>
              {hasName ? item.item_name : t("gatePasses.itemNamePlaceholder", "Item name")}
            </span>
          </div>
          {item.quantity && (
            <span className="text-xs text-muted-foreground">
              {item.quantity} {isRTL ? UNIT_OPTIONS.find(u => u.value === item.unit)?.labelAr : UNIT_OPTIONS.find(u => u.value === item.unit)?.labelEn || item.unit}
            </span>
          )}
        </div>

        {/* Photo count badge */}
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            hasPhotos
              ? "bg-success/10 text-success"
              : showPhotoError
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          )}
        >
          {showPhotoError && <AlertCircle className="h-3 w-3" />}
          {item.photos.length}/{3}
        </div>

        {/* Expand/Collapse */}
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t bg-muted/30">
          <div className="pt-4 grid gap-4">
            {/* Item name */}
            <div className="space-y-2">
              <Label htmlFor={`item-name-${item.id}`} className="text-sm font-medium">
                {t("gatePasses.itemName", "Item Name")} *
              </Label>
              <Input
                id={`item-name-${item.id}`}
                value={item.item_name}
                onChange={(e) => updateField("item_name", e.target.value)}
                placeholder={t("gatePasses.itemNamePlaceholder", "Enter item name")}
                disabled={disabled}
                className={cn("h-12", hasError && !hasName && "border-destructive")}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor={`item-desc-${item.id}`} className="text-sm font-medium">
                {t("gatePasses.itemDescription", "Description")}
              </Label>
              <Input
                id={`item-desc-${item.id}`}
                value={item.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder={t("gatePasses.descriptionPlaceholder", "Optional description")}
                disabled={disabled}
                className="h-12"
              />
            </div>

            {/* Quantity & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`item-qty-${item.id}`} className="text-sm font-medium">
                  {t("gatePasses.quantity", "Quantity")}
                </Label>
                <Input
                  id={`item-qty-${item.id}`}
                  type="text"
                  inputMode="numeric"
                  value={item.quantity}
                  onChange={(e) => updateField("quantity", e.target.value)}
                  placeholder="0"
                  disabled={disabled}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`item-unit-${item.id}`} className="text-sm font-medium">
                  {t("gatePasses.unit", "Unit")}
                </Label>
                <Select
                  value={item.unit}
                  onValueChange={(value) => updateField("unit", value)}
                  disabled={disabled}
                >
                  <SelectTrigger id={`item-unit-${item.id}`} className="h-12">
                    <SelectValue placeholder={t("gatePasses.selectUnit", "Select")} />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {isRTL ? unit.labelAr : unit.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {t("gatePasses.itemPhotos", "Item Photos")} *
              </Label>
              <GatePassPhotoCapture
                photos={item.photos}
                photoPreviewUrls={item.photoPreviewUrls}
                onPhotosChange={handlePhotosChange}
                error={showPhotoError}
                disabled={disabled}
                maxPhotos={3}
              />
            </div>
          </div>

          {/* Remove button */}
          {canRemove && (
            <div className="pt-2 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                disabled={disabled}
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 me-2" />
                {t("gatePasses.removeItem", "Remove Item")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
