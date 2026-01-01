/**
 * QR Code Generator Helper
 * Generates QR code images and uploads them to Supabase Storage
 */

// Using a simple QR code library that works in Deno
import { qrcode } from "https://deno.land/x/qrcode@v2.0.0/mod.ts";

interface QRGenerationResult {
  success: boolean;
  publicUrl?: string;
  storagePath?: string;
  error?: string;
}

/**
 * Generates a QR code image as base64 PNG
 */
export async function generateQRCodeBase64(data: string, size: number = 400): Promise<string | null> {
  try {
    // qrcode library returns a QRCode object, need to call toString() or similar
    const qrResult = await qrcode(data, { size });
    // The library returns an object with base64 data URL
    const dataUrl = typeof qrResult === 'string' ? qrResult : String(qrResult);
    console.log(`[QR] Generated QR code for data length: ${data.length}`);
    return dataUrl;
  } catch (err) {
    console.error('[QR] Error generating QR code:', err);
    return null;
  }
}

/**
 * Converts a base64 data URL to Uint8Array bytes
 */
export function base64ToBytes(dataUrl: string): Uint8Array {
  // Extract base64 data from data URL (format: data:image/...;base64,XXXX)
  const base64Data = dataUrl.split(',')[1];
  if (!base64Data) {
    throw new Error('Invalid data URL format');
  }
  
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}

/**
 * Generates a QR code and uploads it to Supabase Storage
 */
export async function generateAndUploadQR(
  supabase: any,
  qrData: string,
  fileName: string,
  bucketName: string = 'worker-qr-codes'
): Promise<QRGenerationResult> {
  try {
    // Generate QR code as base64 data URL
    const dataUrl = await generateQRCodeBase64(qrData, 400);
    if (!dataUrl) {
      return { success: false, error: 'Failed to generate QR code image' };
    }

    // Convert to bytes
    const imageBytes = base64ToBytes(dataUrl);
    
    // Determine mime type from data URL
    const mimeMatch = dataUrl.match(/data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/gif';
    
    // Ensure file extension matches mime type
    const extension = mimeType === 'image/gif' ? 'gif' : 'png';
    const finalFileName = fileName.endsWith(`.${extension}`) 
      ? fileName 
      : `${fileName.replace(/\.[^.]+$/, '')}.${extension}`;
    
    console.log(`[QR] Uploading QR image: ${finalFileName} (${imageBytes.length} bytes)`);

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(finalFileName, imageBytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[QR] Storage upload error:', uploadError);
      return { success: false, error: `Storage upload failed: ${uploadError.message}` };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(finalFileName);

    const publicUrl = urlData?.publicUrl;
    console.log(`[QR] Upload successful, public URL: ${publicUrl}`);

    return {
      success: true,
      publicUrl,
      storagePath: `${bucketName}/${finalFileName}`,
    };
  } catch (err) {
    console.error('[QR] Error in generateAndUploadQR:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * Generates QR code content for worker access
 * Format: WORKER:{qr_token}
 */
export function getWorkerQRContent(qrToken: string): string {
  return `WORKER:${qrToken}`;
}
