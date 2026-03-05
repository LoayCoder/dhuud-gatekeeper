import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { compressImageWithWatermark, WatermarkOptions } from '@/lib/upload-utils';
import { getCurrentGPS } from '@/hooks/use-gps-capture';

interface CheckpointPhotoCaptureProps {
  patrolId: string;
  checkpointId: string;
  onPhotosCaptured: (paths: string[]) => void;
  existingPhotos?: string[];
  required?: boolean;
  branchName?: string;
  siteName?: string;
}

export function CheckpointPhotoCapture({
  patrolId,
  checkpointId,
  onPhotosCaptured,
  existingPhotos = [],
  required = false,
  branchName,
  siteName,
}: CheckpointPhotoCaptureProps) {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [photos, setPhotos] = useState<string[]>(existingPhotos);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = async (file: File, watermarkOptions?: WatermarkOptions) => {
    if (!profile?.tenant_id) return null;

    // Apply watermark and compress
    const processedFile = await compressImageWithWatermark(file, watermarkOptions, 1920, 0.85);

    const fileExt = file.name.split('.').pop();
    const fileName = `${patrolId}/${checkpointId}/${Date.now()}.${fileExt}`;
    const storagePath = `patrol-photos/${profile.tenant_id}/${fileName}`;

    const { error } = await supabase.storage
      .from('patrol-evidence')
      .upload(storagePath, processedFile, {
        contentType: processedFile.type,
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    return storagePath;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      // Get GPS coordinates for watermark
      const gps = await getCurrentGPS();
      const timestamp = new Date();
      const language = i18n.language === 'ar' ? 'ar' : 'en';
      
      // Prepare watermark options
      const watermarkOptions: WatermarkOptions = {
        timestamp,
        branchName,
        siteName,
        gpsLat: gps?.lat,
        gpsLng: gps?.lng,
        language,
      };

      const uploadedPaths: string[] = [];
      
      for (const file of Array.from(files)) {
        const path = await uploadPhoto(file, watermarkOptions);
        if (path) {
          uploadedPaths.push(path);
        }
      }

      const newPhotos = [...photos, ...uploadedPaths];
      setPhotos(newPhotos);
      onPhotosCaptured(newPhotos);
      toast.success(t('security.patrols.execution.photoUploaded', 'Photo uploaded'));
    } catch (error) {
      console.error('Failed to upload photo:', error);
      toast.error(t('security.patrols.execution.photoUploadFailed', 'Failed to upload photo'));
    } finally {
      setIsUploading(false);
      // Reset inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    onPhotosCaptured(newPhotos);
  };

  const getPhotoUrl = (path: string) => {
    const { data } = supabase.storage.from('patrol-evidence').getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {t('security.patrols.execution.photos', 'Photos')}
          {required && <span className="text-destructive ms-1">*</span>}
        </span>
        <span className="text-xs text-muted-foreground">
          {photos.length} {t('security.patrols.execution.photosCount', 'photo(s)')}
        </span>
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((path, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
              <img
                src={getPhotoUrl(path)}
                alt={`Photo ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 end-1 h-6 w-6"
                onClick={() => removePhoto(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Capture Buttons */}
      <div className="flex gap-2">
        {/* Camera capture - mobile */}
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {t('security.patrols.execution.takePhoto', 'Take Photo')}
        </Button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* File upload */}
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {t('security.patrols.execution.uploadPhoto', 'Upload')}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {required && photos.length === 0 && (
        <p className="text-xs text-destructive">
          {t('security.patrols.execution.photoRequired', 'At least one photo is required for this checkpoint')}
        </p>
      )}
    </div>
  );
}
