import { useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Camera, ImagePlus, Trash2, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/upload-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface GatePassItemData {
  id: string;
  sr_number: string;
  item_name: string;
  description: string;
  quantity: string;
  unit: string;
  photo: File | null;
  photoPreviewUrl: string | null;
}

interface PublicGatePassItemFormProps {
  item: GatePassItemData;
  index: number;
  onUpdate: (index: number, field: keyof GatePassItemData, value: string | File | null) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  showValidation: boolean;
}

export function PublicGatePassItemForm({
  item,
  index,
  onUpdate,
  onRemove,
  canRemove,
  showValidation,
}: PublicGatePassItemFormProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const hasPhotoError = showValidation && !item.photo;
  const hasNameError = showValidation && !item.item_name.trim();

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        // Compress image (max 1280px, 75% quality)
        const compressedFile = await compressImage(file, 1280, 0.75);
        const url = URL.createObjectURL(compressedFile);

        // Revoke old URL if exists
        if (item.photoPreviewUrl) {
          URL.revokeObjectURL(item.photoPreviewUrl);
        }

        onUpdate(index, "photo", compressedFile);
        onUpdate(index, "photoPreviewUrl" as keyof GatePassItemData, url);
      } catch (error) {
        console.error("Failed to process image:", error);
      }

      // Reset input
      e.target.value = "";
    },
    [index, item.photoPreviewUrl, onUpdate]
  );

  const removePhoto = useCallback(() => {
    if (item.photoPreviewUrl) {
      URL.revokeObjectURL(item.photoPreviewUrl);
    }
    onUpdate(index, "photo", null);
    onUpdate(index, "photoPreviewUrl" as keyof GatePassItemData, null);
  }, [index, item.photoPreviewUrl, onUpdate]);

  return (

    <Card className={cn(
      "relative transition-all overflow-hidden border-l-4",
      hasPhotoError || hasNameError ? "border-l-destructive border-t-destructive/50 border-r-destructive/50 border-b-destructive/50" : "border-l-primary"
    )}>
      <CardContent className="pt-4 space-y-4">
        {/* Item Header with Remove Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {index + 1}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              {isRTL ? "تفاصيل البند" : "Item Details"}
            </span>
          </div>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(index)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -me-2"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Photo Upload - Prominent at top for mobile primarily */}
        <div className="space-y-2">
          <Label className={cn(
            "text-xs font-semibold flex items-center gap-1",
            hasPhotoError && "text-destructive"
          )}>
            {hasPhotoError && <AlertCircle className="h-3 w-3" />}
            {isRTL ? "صورة البند (مطلوب)" : "Item Photo (Required)"}
          </Label>

          {item.photoPreviewUrl ? (
            <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden group">
              <img
                src={item.photoPreviewUrl}
                alt={item.item_name || `Item ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8"
                >
                  {isRTL ? "تغيير" : "Change"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={removePhoto}
                  className="h-8"
                >
                  {isRTL ? "حذف" : "Remove"}
                </Button>
              </div>
              {/* Mobile fallback for actions since hover doesn't exist */}
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-2 end-2 p-1.5 bg-destructive text-white rounded-full shadow-md md:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "h-24 flex flex-col gap-2 border-dashed border-2",
                  hasPhotoError && "border-destructive/50 bg-destructive/5 text-destructive hover:bg-destructive/10"
                )}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-6 w-6" />
                <span className="text-xs">{isRTL ? "التقاط صورة" : "Take Photo"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                className={cn(
                  "h-24 flex flex-col gap-2 border-dashed border-2",
                  hasPhotoError && "border-destructive/50 bg-destructive/5 text-destructive hover:bg-destructive/10"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs">{isRTL ? "اختيار من المعرض" : "Upload Image"}</span>
              </Button>
            </div>
          )}

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {hasPhotoError && (
            <p className="text-[10px] text-destructive font-medium animate-pulse">
              {isRTL ? "صورة البند مطلوبة لإكمال الطلب" : "Item photo is required to proceed"}
            </p>
          )}
        </div>

        <div className="grid gap-4">
          {/* Item Name */}
          <div className="space-y-1.5">
            <Label className={cn("text-xs font-semibold", hasNameError && "text-destructive")}>
              {isRTL ? "اسم البند / المادة" : "Item Name / Material"} *
            </Label>
            <Input
              placeholder={isRTL ? "مثال: كابلات نحاسية" : "e.g., Copper Cables"}
              value={item.item_name}
              onChange={(e) => onUpdate(index, "item_name", e.target.value)}
              className={cn(hasNameError && "border-destructive bg-destructive/5")}
            />
            {hasNameError && (
              <span className="text-[10px] text-destructive">
                {isRTL ? "اسم البند مطلوب" : "Item name is required"}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              {isRTL ? "الوصف (اختياري)" : "Description (Optional)"}
            </Label>
            <Textarea
              placeholder={isRTL ? "مواصفات إضافية، لون، حجم..." : "Additional specs, color, size..."}
              value={item.description}
              onChange={(e) => onUpdate(index, "description", e.target.value)}
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* 3-Col Layout for details */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{isRTL ? "الكمية" : "Quantity"}</Label>
              <Input
                placeholder="0"
                type="number"
                value={item.quantity}
                onChange={(e) => onUpdate(index, "quantity", e.target.value)}
                className="text-center"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isRTL ? "الوحدة" : "Unit"}</Label>
              <Select
                value={item.unit}
                onValueChange={(value) => onUpdate(index, "unit", value)}
              >
                <SelectTrigger className="text-center">
                  <SelectValue placeholder={isRTL ? "اختر" : "Select"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PCS">{isRTL ? "قطعة" : "PCS"}</SelectItem>
                  <SelectItem value="BOX">{isRTL ? "صندوق" : "BOX"}</SelectItem>
                  <SelectItem value="KG">{isRTL ? "كيلوجرام" : "KG"}</SelectItem>
                  <SelectItem value="M">{isRTL ? "متر" : "M"}</SelectItem>
                  <SelectItem value="L">{isRTL ? "لتر" : "L"}</SelectItem>
                  <SelectItem value="ROLL">{isRTL ? "لفة" : "ROLL"}</SelectItem>
                  <SelectItem value="SET">{isRTL ? "طقم" : "SET"}</SelectItem>
                  <SelectItem value="PAIR">{isRTL ? "زوج" : "PAIR"}</SelectItem>
                  <SelectItem value="PACK">{isRTL ? "حزمة" : "PACK"}</SelectItem>
                  <SelectItem value="DOZ">{isRTL ? "دزينة" : "DOZ"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isRTL ? "الرقم التسلسلي" : "Serial #"}</Label>
              <Input
                placeholder="#"
                value={item.sr_number}
                onChange={(e) => onUpdate(index, "sr_number", e.target.value)}
                className="text-center font-mono text-xs"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
