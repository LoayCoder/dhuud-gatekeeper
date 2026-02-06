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
      "relative transition-all",
      hasPhotoError || hasNameError ? "border-destructive" : ""
    )}>
      <CardContent className="pt-4 space-y-4">
        {/* Item Header with Remove Button */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {isRTL ? `البند ${index + 1}` : `Item ${index + 1}`}
          </span>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* SR Number & Item Name Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <Label className="text-xs">
              {isRTL ? "الرقم التسلسلي" : "SR #"}
            </Label>
            <Input
              placeholder={isRTL ? "مثال: 001" : "e.g., 001"}
              value={item.sr_number}
              onChange={(e) => onUpdate(index, "sr_number", e.target.value)}
              className="h-10 mt-1"
            />
          </div>
          <div className="col-span-2">
            <Label className={cn("text-xs", hasNameError && "text-destructive")}>
              {isRTL ? "اسم البند" : "Item Name"} *
            </Label>
            <Input
              placeholder={isRTL ? "اسم البند أو المادة" : "Item or material name"}
              value={item.item_name}
              onChange={(e) => onUpdate(index, "item_name", e.target.value)}
              className={cn("h-10 mt-1", hasNameError && "border-destructive")}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <Label className="text-xs">
            {isRTL ? "الوصف" : "Description"}
          </Label>
          <Textarea
            placeholder={isRTL ? "وصف إضافي (اختياري)" : "Additional description (optional)"}
            value={item.description}
            onChange={(e) => onUpdate(index, "description", e.target.value)}
            rows={2}
            className="mt-1 resize-none"
          />
        </div>

        {/* Quantity & Unit Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">
              {isRTL ? "الكمية" : "Quantity"}
            </Label>
            <Input
              placeholder={isRTL ? "مثال: 10" : "e.g., 10"}
              value={item.quantity}
              onChange={(e) => onUpdate(index, "quantity", e.target.value)}
              className="h-10 mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">
              {isRTL ? "الوحدة" : "Unit"}
            </Label>
            <Input
              placeholder={isRTL ? "مثال: صندوق" : "e.g., boxes"}
              value={item.unit}
              onChange={(e) => onUpdate(index, "unit", e.target.value)}
              className="h-10 mt-1"
            />
          </div>
        </div>

        {/* Photo Upload Section */}
        <div className="space-y-2">
          <Label className={cn(
            "text-xs flex items-center gap-1",
            hasPhotoError && "text-destructive"
          )}>
            {isRTL ? "صورة البند" : "Item Photo"} *
            {hasPhotoError && (
              <AlertCircle className="h-3 w-3" />
            )}
          </Label>

          {item.photoPreviewUrl ? (
            <div className="relative inline-block">
              <img
                src={item.photoPreviewUrl}
                alt={item.item_name || `Item ${index + 1}`}
                className="h-24 w-24 rounded-lg object-cover border"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute -top-2 -end-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors shadow"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              {/* Camera Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                className={cn(
                  "flex-1 h-12",
                  hasPhotoError && "border-destructive text-destructive"
                )}
              >
                <Camera className="h-4 w-4 me-2" />
                {isRTL ? "التقط" : "Capture"}
              </Button>

              {/* File Upload Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex-1 h-12",
                  hasPhotoError && "border-destructive text-destructive"
                )}
              >
                <ImagePlus className="h-4 w-4 me-2" />
                {isRTL ? "اختر" : "Choose"}
              </Button>
            </div>
          )}

          {/* Hidden file inputs */}
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
            <p className="text-xs text-destructive">
              {isRTL ? "صورة البند مطلوبة" : "Item photo is required"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
