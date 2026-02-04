import * as React from "react";
import { useTranslation } from "react-i18next";
import { Camera, Upload, X, Loader2, ImagePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/upload-utils";

interface GatePassPhotoCaptureProps {
  photos: File[];
  photoPreviewUrls: string[];
  onPhotosChange: (photos: File[], previewUrls: string[]) => void;
  error?: boolean;
  disabled?: boolean;
  maxPhotos?: number;
  compact?: boolean;
}

export function GatePassPhotoCapture({
  photos,
  photoPreviewUrls,
  onPhotosChange,
  error = false,
  disabled = false,
  maxPhotos = 3,
  compact = false,
}: GatePassPhotoCaptureProps) {
  const { t } = useTranslation();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [selectedPreview, setSelectedPreview] = React.useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);

    try {
      const newPhotos: File[] = [...photos];
      const newPreviewUrls: string[] = [...photoPreviewUrls];

      for (let i = 0; i < files.length; i++) {
        if (newPhotos.length >= maxPhotos) break;

        const file = files[i];
        if (!file.type.startsWith("image/")) continue;

        // Compress image for mobile-first performance
        const compressed = await compressImage(file, 1280, 0.75);
        newPhotos.push(compressed);
        newPreviewUrls.push(URL.createObjectURL(compressed));
      }

      onPhotosChange(newPhotos, newPreviewUrls);

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(15);
      }
    } finally {
      setIsProcessing(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    const newPreviewUrls = [...photoPreviewUrls];

    URL.revokeObjectURL(newPreviewUrls[index]);

    newPhotos.splice(index, 1);
    newPreviewUrls.splice(index, 1);

    onPhotosChange(newPhotos, newPreviewUrls);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const hasPhotos = photos.length > 0;
  const canAddMore = photos.length < maxPhotos;

  // Compact mode for table cells
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          disabled={disabled || !canAddMore}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          disabled={disabled || !canAddMore}
          className="hidden"
        />

        {hasPhotos && (
          <div className="flex -space-x-2 rtl:space-x-reverse">
            {photoPreviewUrls.slice(0, 3).map((url, index) => (
              <div
                key={index}
                className="relative h-10 w-10 rounded-lg overflow-hidden border-2 border-background shadow-sm"
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {canAddMore && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled || isProcessing}
            className={cn("h-10 w-10 p-0", error && !hasPhotos && "text-destructive")}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </Button>
        )}

        {hasPhotos && (
          <span className="text-xs text-muted-foreground">
            {photos.length}/{maxPhotos}
          </span>
        )}
      </div>
    );
  }

  // Full-size mode for wizard steps
  return (
    <div className="space-y-4">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        disabled={disabled || !canAddMore}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        disabled={disabled || !canAddMore}
        className="hidden"
      />

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Existing photos */}
        {photoPreviewUrls.map((url, index) => (
          <div
            key={index}
            className="relative aspect-square rounded-xl overflow-hidden border-2 border-border bg-muted group cursor-pointer"
            onClick={() => setSelectedPreview(url)}
          >
            <img
              src={url}
              alt={`Photo ${index + 1}`}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removePhoto(index);
              }}
              disabled={disabled}
              className="absolute top-2 end-2 h-7 w-7 rounded-full bg-destructive/90 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        ))}

        {/* Add more button */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled || isProcessing}
            className={cn(
              "aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all",
              "hover:border-primary hover:bg-primary/5",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              error && !hasPhotos
                ? "border-destructive bg-destructive/5"
                : "border-muted-foreground/30",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {isProcessing ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Camera className={cn("h-8 w-8", error && !hasPhotos ? "text-destructive" : "text-muted-foreground")} />
                <span className={cn("text-xs font-medium", error && !hasPhotos ? "text-destructive" : "text-muted-foreground")}>
                  {t("gatePasses.addPhoto", "Add Photo")}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || isProcessing || !canAddMore}
          className="flex-1 h-12"
        >
          <Camera className="h-4 w-4 me-2" />
          {t("gatePasses.takePhoto", "Camera")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isProcessing || !canAddMore}
          className="flex-1 h-12"
        >
          <Upload className="h-4 w-4 me-2" />
          {t("gatePasses.uploadPhoto", "Gallery")}
        </Button>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between text-sm">
        <span className={cn(error && !hasPhotos ? "text-destructive" : "text-muted-foreground")}>
          {hasPhotos
            ? t("gatePasses.photosAdded", "{{count}} photo(s) added", { count: photos.length })
            : error
            ? t("gatePasses.photoRequired", "At least one photo is required")
            : t("gatePasses.addPhotoHint", "Add photos of the item")}
        </span>
        <span className="text-muted-foreground">
          {photos.length}/{maxPhotos}
        </span>
      </div>

      {/* Full-screen preview modal */}
      {selectedPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPreview(null)}
        >
          <button
            className="absolute top-4 end-4 h-10 w-10 rounded-full bg-white/10 flex items-center justify-center"
            onClick={() => setSelectedPreview(null)}
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <img
            src={selectedPreview}
            alt="Preview"
            className="max-h-full max-w-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
