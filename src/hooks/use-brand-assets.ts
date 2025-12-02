import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type AssetType = 'logo' | 'icon' | 'background';

interface ValidationResult {
  valid: boolean;
  error?: string;
}

const validateFile = async (file: File, type: AssetType): Promise<ValidationResult> => {
  // Validate file type
  const allowedTypes: Record<AssetType, string[]> = {
    logo: ['image/png', 'image/svg+xml'],
    icon: ['image/png'],
    background: ['image/png', 'image/jpeg', 'image/jpg'],
  };

  if (!allowedTypes[type].includes(file.type)) {
    const formats = type === 'logo' ? 'PNG or SVG' : type === 'icon' ? 'PNG' : 'PNG or JPG';
    return { valid: false, error: `Invalid file type. Please upload a ${formats} file.` };
  }

  // Validate dimensions for images (not SVG)
  if (file.type !== 'image/svg+xml') {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        
        if (type === 'icon') {
          if (img.width !== 512 || img.height !== 512) {
            resolve({ valid: false, error: 'App icon must be exactly 512x512 pixels.' });
            return;
          }
        }
        
        if (type === 'logo') {
          if (img.width < 200 || img.height < 50) {
            resolve({ valid: false, error: 'Logo must be at least 200x50 pixels.' });
            return;
          }
        }
        
        resolve({ valid: true });
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        resolve({ valid: false, error: 'Failed to load image for validation.' });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  return { valid: true };
};

export function useBrandAssets() {
  const [uploading, setUploading] = useState(false);

  const uploadAsset = async (
    file: File,
    type: AssetType,
    tenantId: string
  ): Promise<string | null> => {
    setUploading(true);

    try {
      // Validate the file
      const validation = await validateFile(file, type);
      if (!validation.valid) {
        toast({
          title: 'Validation Error',
          description: validation.error,
          variant: 'destructive',
        });
        return null;
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/${type}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload asset.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadAsset, uploading };
}
