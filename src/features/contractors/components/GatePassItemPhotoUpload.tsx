import * as React from "react";
import { useTranslation } from "react-i18next";
import { Camera, Upload, X, Loader2, ImagePlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GatePassItemPhotoUploadProps {
  photos: File[];
  photoPreviewUrls: string[];
  onPhotosChange: (photos: File[], previewUrls: string[]) => void;
  error?: boolean;
  disabled?: boolean;
  maxPhotos?: number;
}

export function GatePassItemPhotoUpload({
  photos,
  photoPreviewUrls,
  onPhotosChange,
  error = false,
  disabled = false,
  maxPhotos = 3,
}: GatePassItemPhotoUploadProps) {
  const { t } = useTranslation();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

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

        newPhotos.push(file);
        newPreviewUrls.push(URL.createObjectURL(file));
      }

      onPhotosChange(newPhotos, newPreviewUrls);
    } finally {
      setIsProcessing(false);
      // Reset input
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    const newPreviewUrls = [...photoPreviewUrls];
    
    // Revoke URL to prevent memory leak
    URL.revokeObjectURL(newPreviewUrls[index]);
    
    newPhotos.splice(index, 1);
    newPreviewUrls.splice(index, 1);
    
    onPhotosChange(newPhotos, newPreviewUrls);
  };

  const hasPhotos = photos.length > 0;
  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-2">
      {/* Photo previews */}
      {hasPhotos && (
        <div className="flex flex-wrap gap-2">
          {photoPreviewUrls.map((url, index) => (
            <div
              key={index}
              className="relative group h-12 w-12 rounded-md overflow-hidden border border-border"
            >
              <img
                src={url}
                alt={`Photo ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                disabled={disabled}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Camera button (for mobile) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          disabled={disabled || !canAddMore}
          className="hidden"
        />
        
        {/* File upload input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          disabled={disabled || !canAddMore}
          className="hidden"
        />

        {canAddMore && (
          <>
            {/* Camera button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled || isProcessing}
              className={cn(
                "h-8 px-2",
                error && !hasPhotos && "text-destructive hover:text-destructive"
              )}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </Button>

            {/* Upload button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isProcessing}
              className={cn(
                "h-8 px-2",
                error && !hasPhotos && "text-destructive hover:text-destructive"
              )}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Status indicator */}
        {hasPhotos ? (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Check className="h-3 w-3 text-green-500" />
            {photos.length}
          </span>
        ) : (
          <span
            className={cn(
              "text-xs",
              error ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {error ? (
              t("gatePasses.itemPhotoRequired", "Photo required")
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
          </span>
        )}
      </div>
    </div>
  );
}
