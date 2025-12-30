import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { Camera, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  useInspectionPhotos, 
  useUploadInspectionPhoto, 
  useDeleteInspectionPhoto,
  getPhotoUrl 
} from '@/hooks/use-inspection-uploads';
import { getCurrentGPS } from '@/hooks/use-gps-capture';
import { WatermarkOptions } from '@/lib/upload-utils';

interface InspectionPhotoUploadProps {
  responseId: string | null;
  sessionId: string;
  tenantId: string;
  templateItemId: string;
  isLocked: boolean;
  maxPhotos?: number;
  onPhotoCountChange?: (count: number) => void;
  branchName?: string;
  siteName?: string;
}

interface PhotoWithUrl {
  id: string;
  storage_path: string;
  file_name: string;
  url: string | null;
}

export function InspectionPhotoUpload({
  responseId,
  sessionId,
  tenantId,
  templateItemId,
  isLocked,
  maxPhotos = 2,
  onPhotoCountChange,
  branchName,
  siteName,
}: InspectionPhotoUploadProps) {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photosWithUrls, setPhotosWithUrls] = useState<PhotoWithUrl[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const { data: photos = [], isLoading } = useInspectionPhotos(responseId || undefined);
  const uploadMutation = useUploadInspectionPhoto();
  const deleteMutation = useDeleteInspectionPhoto();

  // Load signed URLs for photos
  useEffect(() => {
    const loadUrls = async () => {
      const loaded: PhotoWithUrl[] = [];
      for (const photo of photos) {
        const url = await getPhotoUrl(photo.storage_path);
        loaded.push({
          id: photo.id,
          storage_path: photo.storage_path,
          file_name: photo.file_name,
          url,
        });
      }
      setPhotosWithUrls(loaded);
      onPhotoCountChange?.(loaded.length);
    };
    
    if (photos.length > 0) {
      loadUrls();
    } else {
      setPhotosWithUrls([]);
      onPhotoCountChange?.(0);
    }
  }, [photos, onPhotoCountChange]);

  const handleUpload = useCallback(async (files: File[]) => {
    if (!responseId) {
      toast.error(t('inspections.photos.saveFirstError'));
      return;
    }
    
    if (photos.length + files.length > maxPhotos) {
      toast.error(t('inspections.photos.maxPhotosError', { max: maxPhotos }));
      return;
    }
    
    setUploading(true);
    
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
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(t('inspections.photos.invalidType'));
        continue;
      }
      
      try {
        await uploadMutation.mutateAsync({
          file,
          responseId,
          sessionId,
          tenantId,
          gpsLat: gps?.lat,
          gpsLng: gps?.lng,
          gpsAccuracy: gps?.accuracy,
          watermarkOptions,
        });
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(t('inspections.photos.uploadError'));
      }
    }
    
    setUploading(false);
    toast.success(t('inspections.photos.uploadSuccess'));
  }, [responseId, sessionId, tenantId, photos.length, maxPhotos, uploadMutation, t, i18n.language, branchName, siteName]);

  const handleDelete = async (photoId: string) => {
    if (!responseId) return;
    
    try {
      await deleteMutation.mutateAsync({ photoId, responseId });
      toast.success(t('inspections.photos.deleteSuccess'));
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(t('inspections.photos.deleteError'));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] },
    maxFiles: maxPhotos - photos.length,
    disabled: isLocked || !responseId || photos.length >= maxPhotos,
  });

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(Array.from(files));
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const canUpload = !isLocked && responseId && photos.length < maxPhotos;
  const remainingSlots = maxPhotos - photos.length;

  return (
    <div className="space-y-3">
      {/* Photo thumbnails */}
      {photosWithUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photosWithUrls.map((photo) => (
            <div key={photo.id} className="relative group">
              {photo.url ? (
                <img
                  src={photo.url}
                  alt={photo.file_name}
                  className="h-16 w-16 object-cover rounded-md border border-border"
                />
              ) : (
                <div className="h-16 w-16 flex items-center justify-center bg-muted rounded-md border border-border">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => handleDelete(photo.id)}
                  className="absolute -top-1.5 -end-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload controls */}
      {canUpload && (
        <div className="space-y-2">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{t('inspections.photos.uploading')}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {isDragActive 
                    ? t('inspections.photos.dropHere')
                    : t('inspections.photos.dragOrClick')
                  }
                </span>
                <span className="text-xs text-muted-foreground">
                  {t('inspections.photos.remaining', { count: remainingSlots })}
                </span>
              </div>
            )}
          </div>

          {/* Camera button for mobile */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCameraCapture}
            disabled={uploading}
            className="w-full"
          >
            <Camera className="h-4 w-4 me-2" />
            {t('inspections.photos.takePhoto')}
          </Button>
        </div>
      )}

      {/* Status messages */}
      {!responseId && !isLocked && (
        <p className="text-xs text-muted-foreground text-center">
          {t('inspections.photos.saveFirst')}
        </p>
      )}
      
      {photos.length >= maxPhotos && !isLocked && (
        <p className="text-xs text-muted-foreground text-center">
          {t('inspections.photos.maxReached', { max: maxPhotos })}
        </p>
      )}
    </div>
  );
}
