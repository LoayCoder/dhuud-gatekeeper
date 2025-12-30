/**
 * Photo Watermarking Utility
 * Adds timestamp, branch/site name, and GPS location overlay to photos
 */

export interface WatermarkOptions {
  timestamp?: Date;
  branchName?: string;
  siteName?: string;
  gpsLat?: number;
  gpsLng?: number;
  language?: 'ar' | 'en';
  customText?: string;
}

/**
 * Format GPS coordinates for display
 */
function formatGPSCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date, language: 'ar' | 'en'): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';
  return date.toLocaleString(locale, options);
}

/**
 * Add watermark overlay to a photo
 * Returns a new File with the watermark embedded
 */
export async function addPhotoWatermark(
  file: File,
  options: WatermarkOptions
): Promise<File> {
  // Only process images
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

      const { width, height } = img;
      canvas.width = width;
      canvas.height = height;

      if (!ctx) {
        resolve(file);
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      // Calculate watermark dimensions
      const overlayHeight = Math.max(height * 0.12, 80);
      const padding = Math.max(width * 0.02, 12);
      const fontSize = Math.max(Math.min(width * 0.025, 24), 12);
      const lineHeight = fontSize * 1.4;

      // Draw semi-transparent overlay at bottom
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, height - overlayHeight, width, overlayHeight);

      // Setup text style
      ctx.fillStyle = '#ffffff';
      ctx.font = `${fontSize}px "IBM Plex Sans Arabic", "Cairo", system-ui, sans-serif`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const language = options.language || 'en';
      const isRTL = language === 'ar';
      
      // Set text alignment based on language direction
      ctx.textAlign = isRTL ? 'right' : 'left';
      const textX = isRTL ? width - padding : padding;

      let currentY = height - overlayHeight + padding + fontSize;

      // Line 1: Branch and Site name
      const locationParts: string[] = [];
      if (options.siteName) {
        locationParts.push(options.siteName);
      }
      if (options.branchName) {
        locationParts.push(options.branchName);
      }
      if (locationParts.length > 0) {
        const locationText = locationParts.join(' | ');
        ctx.fillText(locationText, textX, currentY);
        currentY += lineHeight;
      }

      // Line 2: Timestamp
      if (options.timestamp) {
        const timestampText = formatTimestamp(options.timestamp, language);
        ctx.fillText(timestampText, textX, currentY);
        currentY += lineHeight;
      }

      // Line 3: GPS coordinates
      if (options.gpsLat !== undefined && options.gpsLng !== undefined) {
        const gpsLabel = language === 'ar' ? 'الموقع: ' : 'GPS: ';
        const gpsText = gpsLabel + formatGPSCoordinates(options.gpsLat, options.gpsLng);
        ctx.fillText(gpsText, textX, currentY);
        currentY += lineHeight;
      }

      // Line 4: Custom text (optional)
      if (options.customText) {
        ctx.fillText(options.customText, textX, currentY);
      }

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          // Create new file with watermark
          const watermarkedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          resolve(watermarkedFile);
        },
        'image/jpeg',
        0.92 // High quality to preserve watermark text
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(file); // Return original on error
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Batch watermark multiple files
 */
export async function addWatermarkToFiles(
  files: File[],
  options: WatermarkOptions
): Promise<File[]> {
  return Promise.all(files.map(file => addPhotoWatermark(file, options)));
}
