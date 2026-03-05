import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, X, CheckCircle2, Image, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { FormDescription, FormItem, FormLabel } from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const MAX_PHOTOS = 2;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface ClosedOnSpotSectionProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  direction: string;
}

export function ClosedOnSpotSection({
  enabled,
  onEnabledChange,
  photos,
  onPhotosChange,
  direction,
}: ClosedOnSpotSectionProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Validate file type
      if (!file.type.startsWith('image/')) continue;
      // Validate file size (max 10MB)
      if (file.size > MAX_FILE_SIZE) continue;
      newPhotos.push(file);
    }

    // Limit to max photos
    const combinedPhotos = [...photos, ...newPhotos].slice(0, MAX_PHOTOS);
    onPhotosChange(combinedPhotos);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  return (
    <FormItem>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <FormLabel className="text-base">{t('incidents.closedOnSpot.label')}</FormLabel>
          <FormDescription>{t('incidents.closedOnSpot.description')}</FormDescription>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      {enabled && (
        <div className="mt-4 space-y-4 ps-4 border-s-2 border-green-500">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-3">
            {photos.length < MAX_PHOTOS && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                {t('incidents.closedOnSpot.addPhotos')}
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              {photos.length}/{MAX_PHOTOS} {t('incidents.closedOnSpot.photosAdded')}
            </span>
          </div>

          {/* Photo Grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`${t('incidents.closedOnSpot.photoEvidence')} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 end-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemovePhoto(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <span className="absolute bottom-1 start-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                    {(photo.size / 1024).toFixed(0)} KB
                  </span>
                </div>
              ))}

              {/* Add more button */}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 flex items-center justify-center transition-colors"
                >
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </FormItem>
  );
}

interface ClosedOnSpotConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  direction: string;
}

export function ClosedOnSpotConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  direction,
}: ClosedOnSpotConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir={direction}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('incidents.closedOnSpot.confirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {t('incidents.closedOnSpot.confirmMessage')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4" />
            {t('incidents.closedOnSpot.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
