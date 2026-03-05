import { ReactElement } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
export function QuickObservationCardFormPhotos({ photos, removePhoto, handlePhotoCapture }: unknown) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
                <label className="text-sm font-medium">{t('quickObservation.addPhoto')}</label>
                <div className="flex flex-wrap gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 end-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 5 && (
                    <>
                      {/* Camera Capture Button */}
                      <label className="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">{t('quickObservation.camera')}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handlePhotoCapture(e)}
                        />
                      </label>
                      
                      {/* Gallery Upload Button */}
                      <label className="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                        <ImagePlus className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground mt-1">{t('quickObservation.gallery')}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
                          multiple
                          className="hidden"
                          onChange={(e) => handlePhotoCapture(e)}
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
              
              
  );
}