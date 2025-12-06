import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, Star, Trash2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useUploadAssetPhoto, useDeleteAssetPhoto, useSetPrimaryPhoto } from '@/hooks/use-asset-uploads';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssetPhoto {
  id: string;
  storage_path: string;
  file_name: string;
  is_primary: boolean | null;
  caption: string | null;
  created_at: string | null;
}

interface AssetPhotoUploadProps {
  assetId: string;
  photos: AssetPhoto[];
  canManage: boolean;
}

export function AssetPhotoUpload({ assetId, photos, canManage }: AssetPhotoUploadProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  const uploadPhoto = useUploadAssetPhoto();
  const deletePhoto = useDeleteAssetPhoto();
  const setPrimary = useSetPrimaryPhoto();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!canManage || acceptedFiles.length === 0) return;

    // Limit to 10 photos at a time
    const filesToUpload = acceptedFiles.slice(0, 10);
    setUploading(true);
    setUploadProgress({ current: 0, total: filesToUpload.length });

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        await uploadPhoto.mutateAsync({
          assetId,
          file: filesToUpload[i],
          isPrimary: photos.length === 0 && i === 0, // First photo is primary if no photos exist
        });
        setUploadProgress({ current: i + 1, total: filesToUpload.length });
      }
      toast.success(t('assets.photos.uploadSuccess'));
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('assets.photos.uploadError'));
    } finally {
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  }, [assetId, canManage, photos.length, uploadPhoto, t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: !canManage || uploading,
  });

  const handleDelete = async (photoId: string) => {
    try {
      await deletePhoto.mutateAsync(photoId);
      toast.success(t('assets.photos.deleteSuccess'));
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(t('assets.photos.deleteError'));
    }
  };

  const handleSetPrimary = async (photoId: string) => {
    try {
      await setPrimary.mutateAsync({ assetId, photoId });
      toast.success(t('assets.photos.primarySet'));
    } catch (error) {
      console.error('Set primary error:', error);
      toast.error(t('assets.photos.primaryError'));
    }
  };

  const getPhotoUrl = (storagePath: string) => {
    const { data } = supabase.storage.from('asset-files').getPublicUrl(storagePath);
    return data.publicUrl;
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {canManage && (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
            uploading && 'opacity-50 pointer-events-none'
          )}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t('assets.photos.uploading')} ({uploadProgress.current}/{uploadProgress.total})
              </p>
            </div>
          ) : (
            <>
              <ImagePlus className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium">{t('assets.photos.dragDrop')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('assets.photos.dragDropHint')}
              </p>
            </>
          )}
        </div>
      )}

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <ImagePlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('assets.photos.noPhotos')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="overflow-hidden group relative">
              <CardContent className="p-0">
                <img
                  src={getPhotoUrl(photo.storage_path)}
                  alt={photo.caption || photo.file_name}
                  className="w-full aspect-square object-cover"
                />
                
                {/* Primary Badge */}
                {photo.is_primary && (
                  <div className="absolute top-2 start-2">
                    <div className="bg-yellow-500 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      {t('assets.photos.primary')}
                    </div>
                  </div>
                )}

                {/* Action Overlay */}
                {canManage && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!photo.is_primary && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleSetPrimary(photo.id)}
                        disabled={setPrimary.isPending}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(photo.id)}
                      disabled={deletePhoto.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
