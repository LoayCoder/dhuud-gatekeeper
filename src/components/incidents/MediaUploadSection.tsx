import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Video, X, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { compressImage } from '@/lib/upload-utils';

interface MediaUploadSectionProps {
  photos: File[];
  video: File | null;
  onPhotosChange: (photos: File[]) => void;
  onVideoChange: (video: File | null) => void;
}

const MAX_PHOTOS = 2;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_DURATION = 10; // seconds

const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

const validateVideoDuration = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration <= MAX_VIDEO_DURATION);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(false);
    };
    video.src = URL.createObjectURL(file);
  });
};

export default function MediaUploadSection({
  photos,
  video,
  onPhotosChange,
  onVideoChange,
}: MediaUploadSectionProps) {
  const { t } = useTranslation();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoCameraRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoCameraRef = useRef<HTMLInputElement>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: File[] = [];
    const newUrls: string[] = [];

    for (let i = 0; i < files.length && photos.length + newPhotos.length < MAX_PHOTOS; i++) {
      const file = files[i];
      
      if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
        toast.error(t('incidents.quickCapture.invalidPhotoType'));
        continue;
      }
      
      if (file.size > MAX_PHOTO_SIZE) {
        toast.error(t('incidents.quickCapture.photoTooLarge'));
        continue;
      }

      // Compress image before adding to state
      const compressedFile = await compressImage(file, 1920, 0.85);
      newPhotos.push(compressedFile);
      newUrls.push(URL.createObjectURL(compressedFile));
    }

    if (newPhotos.length > 0) {
      onPhotosChange([...photos, ...newPhotos]);
      setPhotoUrls([...photoUrls, ...newUrls]);
    }

    // Reset inputs
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
    if (photoCameraRef.current) {
      photoCameraRef.current.value = '';
    }
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      toast.error(t('incidents.quickCapture.invalidVideoType'));
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      toast.error(t('incidents.quickCapture.videoTooLarge'));
      return;
    }

    const isValidDuration = await validateVideoDuration(file);
    if (!isValidDuration) {
      toast.error(t('incidents.quickCapture.videoTooLong'));
      return;
    }

    // Clean up old video URL
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    onVideoChange(file);
    setVideoUrl(URL.createObjectURL(file));

    // Reset inputs
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
    if (videoCameraRef.current) {
      videoCameraRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoUrls[index]);
    const newPhotos = photos.filter((_, i) => i !== index);
    const newUrls = photoUrls.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
    setPhotoUrls(newUrls);
  };

  const removeVideo = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    onVideoChange(null);
    setVideoUrl(null);
  };

  const canAddMorePhotos = photos.length < MAX_PHOTOS;

  return (
    <div className="space-y-4">
      {/* Photos Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('incidents.quickCapture.photos')}</span>
          <span className="text-xs text-muted-foreground">
            {photos.length}/{MAX_PHOTOS}
          </span>
        </div>
        
        {photos.length === 0 ? (
          /* No photos - show full-width buttons */
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 gap-2"
              onClick={() => photoCameraRef.current?.click()}
            >
              <Camera className="h-5 w-5" />
              <span>{t('incidents.quickCapture.takePhoto')}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 gap-2"
              onClick={() => photoInputRef.current?.click()}
            >
              <Plus className="h-5 w-5" />
              <span>{t('incidents.quickCapture.fromGallery')}</span>
            </Button>
          </div>
        ) : (
          /* Has photos - show grid with add button */
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photoUrls.map((url, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden border bg-muted"
              >
                <img
                  src={url}
                  alt={`${t('incidents.quickCapture.photo')} ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 end-1 h-7 w-7"
                  onClick={() => removePhoto(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {canAddMorePhotos && (
              <div className="aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto py-2 flex-col gap-1"
                  onClick={() => photoCameraRef.current?.click()}
                >
                  <Camera className="h-5 w-5" />
                  <span className="text-xs">{t('incidents.quickCapture.takePhoto')}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto py-2 flex-col gap-1"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">{t('incidents.quickCapture.fromGallery')}</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Hidden inputs */}
        <input
          ref={photoCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoSelect}
          className="hidden"
        />
        <input
          ref={photoInputRef}
          type="file"
          accept={ACCEPTED_PHOTO_TYPES.join(',')}
          multiple
          onChange={handlePhotoSelect}
          className="hidden"
        />
      </div>

      {/* Video Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('incidents.quickCapture.video')}</span>
          <span className="text-xs text-muted-foreground">
            {t('incidents.quickCapture.maxVideoDuration')}
          </span>
        </div>

        {video && videoUrl ? (
          <div className="relative rounded-lg overflow-hidden border bg-muted">
            <video
              src={videoUrl}
              controls
              className="w-full max-h-48 object-contain"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 end-2 h-8 w-8"
              onClick={removeVideo}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 gap-2"
              onClick={() => videoCameraRef.current?.click()}
            >
              <Camera className="h-5 w-5" />
              <span>{t('incidents.quickCapture.recordVideo')}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 gap-2"
              onClick={() => videoInputRef.current?.click()}
            >
              <Video className="h-5 w-5" />
              <span>{t('incidents.quickCapture.fromGallery')}</span>
            </Button>
          </div>
        )}

        {/* Hidden inputs */}
        <input
          ref={videoCameraRef}
          type="file"
          accept="video/*"
          capture="environment"
          onChange={handleVideoSelect}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept={ACCEPTED_VIDEO_TYPES.join(',')}
          onChange={handleVideoSelect}
          className="hidden"
        />
      </div>

      {/* Info Note */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>{t('incidents.quickCapture.uploadNote')}</span>
      </div>
    </div>
  );
}
