import { useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Camera, X, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/upload-utils";

interface PublicImageUploadProps {
  photos: File[];
  photoUrls: string[];
  onPhotosChange: (photos: File[], urls: string[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
  className?: string;
}

export function PublicImageUpload({
  photos,
  photoUrls,
  onPhotosChange,
  maxPhotos = 5,
  disabled = false,
  className,
}: PublicImageUploadProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const remainingSlots = maxPhotos - photos.length;
      const filesToAdd = Array.from(files).slice(0, remainingSlots);

      const newPhotos: File[] = [];
      const newUrls: string[] = [];

      for (const file of filesToAdd) {
        try {
          // Compress image before adding (max 1280px, 75% quality)
          const compressedFile = await compressImage(file, 1280, 0.75);
          const url = URL.createObjectURL(compressedFile);
          newPhotos.push(compressedFile);
          newUrls.push(url);
        } catch (error) {
          console.error("Failed to process image:", error);
        }
      }

      onPhotosChange([...photos, ...newPhotos], [...photoUrls, ...newUrls]);

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    },
    [photos, photoUrls, maxPhotos, onPhotosChange]
  );

  const removePhoto = useCallback(
    (index: number) => {
      URL.revokeObjectURL(photoUrls[index]);
      const newPhotos = photos.filter((_, i) => i !== index);
      const newUrls = photoUrls.filter((_, i) => i !== index);
      onPhotosChange(newPhotos, newUrls);
    },
    [photos, photoUrls, onPhotosChange]
  );

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Photo Grid */}
      {photoUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photoUrls.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square rounded-lg overflow-hidden bg-muted"
            >
              <img
                src={url}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 end-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Buttons */}
      {canAddMore && !disabled && (
        <div className="flex gap-2">
          {/* Camera Capture Button (Mobile) */}
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-5 w-5 me-2" />
            {isRTL ? "التقط صورة" : "Take Photo"}
          </Button>

          {/* File Upload Button */}
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-5 w-5 me-2" />
            {isRTL ? "اختر صورة" : "Choose Photo"}
          </Button>

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
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Photo count indicator */}
      <p className="text-xs text-muted-foreground text-center">
        {photos.length} / {maxPhotos}{" "}
        {isRTL ? "صور" : "photos"}
      </p>
    </div>
  );
}
