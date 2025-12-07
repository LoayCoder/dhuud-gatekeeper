import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, X, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { compressImage } from '@/lib/upload-utils';

interface FailurePhotoUploadProps {
  sessionId: string;
  assetId: string;
  onPhotosChange: (paths: string[]) => void;
  maxPhotos?: number;
}

export function FailurePhotoUpload({
  sessionId,
  assetId,
  onPhotosChange,
  maxPhotos = 3,
}: FailurePhotoUploadProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [photos, setPhotos] = useState<{ path: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !profile?.tenant_id) return;
    if (photos.length >= maxPhotos) {
      toast.error(t('inspectionSessions.maxPhotosReached', { max: maxPhotos }));
      return;
    }
    
    setUploading(true);
    const newPaths: string[] = [];
    
    try {
      for (const file of Array.from(files).slice(0, maxPhotos - photos.length)) {
        const compressed = await compressImage(file, 1920, 0.85);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const storagePath = `${profile.tenant_id}/${sessionId}/failures/${assetId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('inspection-evidence')
          .upload(storagePath, compressed, { contentType: 'image/jpeg' });
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage
          .from('inspection-evidence')
          .getPublicUrl(storagePath);
        
        newPaths.push(storagePath);
        setPhotos(prev => [...prev, { path: storagePath, url: urlData.publicUrl }]);
      }
      
      onPhotosChange([...photos.map(p => p.path), ...newPaths]);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('common.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };
  
  const handleRemove = async (path: string) => {
    try {
      await supabase.storage.from('inspection-evidence').remove([path]);
      const updated = photos.filter(p => p.path !== path);
      setPhotos(updated);
      onPhotosChange(updated.map(p => p.path));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };
  
  return (
    <div className="space-y-2">
      {/* Photo thumbnails */}
      {photos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {photos.map((photo) => (
            <div key={photo.path} className="relative group">
              <img
                src={photo.url}
                alt=""
                className="w-16 h-16 object-cover rounded border"
              />
              <button
                type="button"
                onClick={() => handleRemove(photo.path)}
                className="absolute -top-1 -end-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Upload buttons */}
      {photos.length < maxPhotos && (
        <div className="flex gap-2">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <Camera className="h-4 w-4 me-2" />
            )}
            {t('inspectionSessions.capturePhoto')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.multiple = true;
              input.onchange = (e) => handleUpload((e.target as HTMLInputElement).files);
              input.click();
            }}
            disabled={uploading}
          >
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        {t('inspectionSessions.photosCount', { count: photos.length, max: maxPhotos })}
      </p>
    </div>
  );
}
