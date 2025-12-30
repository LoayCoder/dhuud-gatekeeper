/**
 * Upload utilities with image compression, watermarking, and parallel uploads
 */

import { addPhotoWatermark, WatermarkOptions } from './photo-watermark';

export type { WatermarkOptions };

// Compress image to reduce file size
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  quality: number = 0.85
): Promise<File> {
  // Only compress images
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip SVGs and GIFs
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      URL.revokeObjectURL(img.src);

      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      if (!ctx) {
        resolve(file);
        return;
      }

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // If compressed is larger, use original
          if (blob.size >= file.size) {
            resolve(file);
            return;
          }

          // Create new file with same name
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(file); // Return original on error
    };

    img.src = URL.createObjectURL(file);
  });
}

// Compress image with optional watermark
export async function compressImageWithWatermark(
  file: File,
  watermarkOptions?: WatermarkOptions,
  maxWidth: number = 1920,
  quality: number = 0.85
): Promise<File> {
  // Apply watermark first if options provided
  let processedFile = file;
  if (watermarkOptions) {
    processedFile = await addPhotoWatermark(file, watermarkOptions);
  }
  
  // Then compress
  return compressImage(processedFile, maxWidth, quality);
}

// Upload multiple files in parallel with optional compression and watermarking
export async function uploadFilesParallel<T>(
  files: File[],
  uploadFn: (file: File, index: number) => Promise<T>,
  options: {
    compressImages?: boolean;
    maxWidth?: number;
    quality?: number;
    onProgress?: (completed: number, total: number) => void;
    watermarkOptions?: WatermarkOptions;
  } = {}
): Promise<T[]> {
  const { 
    compressImages = true, 
    maxWidth = 1920, 
    quality = 0.85,
    onProgress,
    watermarkOptions 
  } = options;

  let completed = 0;
  const total = files.length;

  const uploadWithProgress = async (file: File, index: number) => {
    let processedFile = file;
    
    // Apply watermark if options provided
    if (watermarkOptions && file.type.startsWith('image/')) {
      processedFile = await addPhotoWatermark(file, watermarkOptions);
    }
    
    // Compress if enabled
    if (compressImages) {
      processedFile = await compressImage(processedFile, maxWidth, quality);
    }

    const result = await uploadFn(processedFile, index);
    
    completed++;
    onProgress?.(completed, total);
    
    return result;
  };

  // Upload all in parallel
  return Promise.all(files.map(uploadWithProgress));
}

// Format file size for display
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Get accepted file types string for input
export function getAcceptedTypes(types: string[]): string {
  return types.join(',');
}

// Validate file size
export function validateFileSize(file: File, maxSizeMB: number = 50): boolean {
  return file.size <= maxSizeMB * 1024 * 1024;
}
