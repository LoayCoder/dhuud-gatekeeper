import { useRef, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Camera, X, ImagePlus, UploadCloud, Loader2 } from "lucide-react";
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
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    const remainingSlots = maxPhotos - photos.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    const newPhotos: File[] = [];
    const newUrls: string[] = [];

    for (const file of filesToAdd) {
      if (!file.type.startsWith("image/")) continue;

      try {
        // Compress image (max 1280px, 75% quality)
        const compressedFile = await compressImage(file, 1280, 0.75);
        const url = URL.createObjectURL(compressedFile);
        newPhotos.push(compressedFile);
        newUrls.push(url);
      } catch (error) {
        console.error("Failed to process image:", error);
      }
    }

    onPhotosChange([...photos, ...newPhotos], [...photoUrls, ...newUrls]);
    setIsCompressing(false);
  };

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        processFiles(e.target.files);
      }
      // Reset input
      e.target.value = "";
    },
    [photos, photoUrls, maxPhotos, onPhotosChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [disabled, photos, maxPhotos] // Added dependencies for processFiles context
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
    <div className={cn("space-y-4", className)}>
      {/* Photo Grid */}
      {photoUrls.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photoUrls.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square rounded-xl overflow-hidden bg-muted border shadow-sm group"
            >
              <img
                src={url}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              {!disabled && (
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="p-1.5 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors transform scale-90 active:scale-95"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {/* Mobile fallback delete button */}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 end-1 p-1 bg-destructive text-destructive-foreground rounded-full shadow-sm md:hidden"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {/* Loading Placeholder */}
          {isCompressing && (
            <div className="aspect-square rounded-xl bg-muted border flex items-center justify-center animate-pulse">
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Upload Zone */}
      {canAddMore && !disabled && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-6 transition-all text-center",
            isDragging
              ? "border-primary bg-primary/5 scale-[0.99]"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            photoUrls.length > 0 ? "mt-2" : ""
          )}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="p-3 bg-primary/10 rounded-full text-primary mb-1">
              {isCompressing ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isRTL ? "اضغط للرفع أو اسحب الصور هنا" : "Click to upload or drag & drop"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isRTL ? "يدعم JPG, PNG (بحد أقصى 5 صور)" : "Supports JPG, PNG (Max 5 photos)"}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mt-4 w-full max-w-xs mx-auto">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-4 w-4 me-2" />
                {isRTL ? "الكاميرا" : "Camera"}
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4 me-2" />
                {isRTL ? "المعرض" : "Gallery"}
              </Button>
            </div>
          </div>

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

      {!canAddMore && (
        <p className="text-xs text-amber-500 font-medium text-center">
          {isRTL ? "تم الوصول للحد الأقصى من الصور" : "Maximum photos limit reached"}
        </p>
      )}
    </div>
  );
}

