import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface MediaFile {
  id: string;
  file: File;
  type: 'image' | 'video';
  preview: string;
  uploading?: boolean;
  uploaded?: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface MediaAttachment {
  type: 'image' | 'video';
  url: string;
  path: string;
}

const MAX_IMAGES = 3;
const MAX_VIDEOS = 1;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_DURATION = 10; // seconds

export function useIncidentMedia() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const imageCount = mediaFiles.filter((f) => f.type === 'image').length;
  const videoCount = mediaFiles.filter((f) => f.type === 'video').length;

  const validateFile = useCallback(
    async (file: File): Promise<{ valid: boolean; error?: string }> => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        return { valid: false, error: t('incidents.unsupportedFileType') };
      }

      if (isImage) {
        if (imageCount >= MAX_IMAGES) {
          return { valid: false, error: t('incidents.maxPhotosReached') };
        }
        if (file.size > MAX_IMAGE_SIZE) {
          return { valid: false, error: t('incidents.imageTooLarge') };
        }
      }

      if (isVideo) {
        if (videoCount >= MAX_VIDEOS) {
          return { valid: false, error: t('incidents.maxVideoReached') };
        }
        if (file.size > MAX_VIDEO_SIZE) {
          return { valid: false, error: t('incidents.videoTooLarge') };
        }

        // Check video duration
        const duration = await getVideoDuration(file);
        if (duration > MAX_VIDEO_DURATION) {
          return { valid: false, error: t('incidents.videoDurationError') };
        }
      }

      return { valid: true };
    },
    [imageCount, videoCount, t]
  );

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  };

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        const validation = await validateFile(file);

        if (!validation.valid) {
          toast({
            title: t('common.error'),
            description: validation.error,
            variant: 'destructive',
          });
          continue;
        }

        const isImage = file.type.startsWith('image/');
        const preview = URL.createObjectURL(file);

        const mediaFile: MediaFile = {
          id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          file,
          type: isImage ? 'image' : 'video',
          preview,
        };

        setMediaFiles((prev) => [...prev, mediaFile]);
      }
    },
    [validateFile, toast, t]
  );

  const removeFile = useCallback((id: string) => {
    setMediaFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const uploadAllFiles = useCallback(
    async (incidentId: string): Promise<MediaAttachment[]> => {
      if (!profile?.tenant_id || mediaFiles.length === 0) {
        return [];
      }

      setIsUploading(true);
      const attachments: MediaAttachment[] = [];

      try {
        for (const mediaFile of mediaFiles) {
          const timestamp = Date.now();
          const ext = mediaFile.file.name.split('.').pop() || 'jpg';
          const path = `${profile.tenant_id}/incidents/${incidentId}/${timestamp}-${mediaFile.id}.${ext}`;

          setMediaFiles((prev) =>
            prev.map((f) => (f.id === mediaFile.id ? { ...f, uploading: true } : f))
          );

          const { error } = await supabase.storage
            .from('incident-attachments')
            .upload(path, mediaFile.file, {
              contentType: mediaFile.file.type,
              upsert: false,
            });

          if (error) {
            setMediaFiles((prev) =>
              prev.map((f) =>
                f.id === mediaFile.id ? { ...f, uploading: false, error: error.message } : f
              )
            );
            continue;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from('incident-attachments').getPublicUrl(path);

          attachments.push({
            type: mediaFile.type,
            url: publicUrl,
            path,
          });

          setMediaFiles((prev) =>
            prev.map((f) =>
              f.id === mediaFile.id
                ? { ...f, uploading: false, uploaded: true, url: publicUrl, path }
                : f
            )
          );
        }

        return attachments;
      } finally {
        setIsUploading(false);
      }
    },
    [profile?.tenant_id, mediaFiles]
  );

  const clearAllFiles = useCallback(() => {
    mediaFiles.forEach((f) => {
      if (f.preview) {
        URL.revokeObjectURL(f.preview);
      }
    });
    setMediaFiles([]);
  }, [mediaFiles]);

  return {
    mediaFiles,
    addFiles,
    removeFile,
    uploadAllFiles,
    clearAllFiles,
    isUploading,
    imageCount,
    videoCount,
    canAddImage: imageCount < MAX_IMAGES,
    canAddVideo: videoCount < MAX_VIDEOS,
    hasMedia: mediaFiles.length > 0,
  };
}
