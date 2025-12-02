import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type AssetType = 
  | 'logo-light' | 'logo-dark' 
  | 'sidebar-icon-light' | 'sidebar-icon-dark'
  | 'icon-light' | 'icon-dark'
  | 'background' | 'favicon'
  // Legacy aliases
  | 'logo' | 'sidebar-icon' | 'icon';

interface ValidationResult {
  valid: boolean;
  error?: string;
}

const validateFile = async (file: File, type: AssetType): Promise<ValidationResult> => {
  // Validate file type
  const allowedTypes: Record<string, string[]> = {
    'logo-light': ['image/png', 'image/svg+xml'],
    'logo-dark': ['image/png', 'image/svg+xml'],
    'logo': ['image/png', 'image/svg+xml'],
    'sidebar-icon-light': ['image/png', 'image/svg+xml'],
    'sidebar-icon-dark': ['image/png', 'image/svg+xml'],
    'sidebar-icon': ['image/png', 'image/svg+xml'],
    'icon-light': ['image/png'],
    'icon-dark': ['image/png'],
    'icon': ['image/png'],
    'background': ['image/png', 'image/jpeg', 'image/jpg'],
    'favicon': ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/ico'],
  };

  if (!allowedTypes[type]?.includes(file.type)) {
    const formatMap: Record<string, string> = {
      'logo-light': 'PNG or SVG',
      'logo-dark': 'PNG or SVG',
      'logo': 'PNG or SVG',
      'sidebar-icon-light': 'PNG or SVG',
      'sidebar-icon-dark': 'PNG or SVG',
      'sidebar-icon': 'PNG or SVG',
      'icon-light': 'PNG',
      'icon-dark': 'PNG',
      'icon': 'PNG',
      'background': 'PNG or JPG',
      'favicon': 'PNG or ICO',
    };
    return { valid: false, error: `Invalid file type. Please upload a ${formatMap[type]} file.` };
  }

  // Validate dimensions for images (not SVG or ICO)
  if (file.type !== 'image/svg+xml' && !file.type.includes('icon') && !file.type.includes('ico')) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        
        // App icons (any variant)
        if (type === 'icon' || type === 'icon-light' || type === 'icon-dark') {
          if (img.width !== 512 || img.height !== 512) {
            resolve({ valid: false, error: 'App icon must be exactly 512x512 pixels.' });
            return;
          }
        }
        
        // Logos (any variant)
        if (type === 'logo' || type === 'logo-light' || type === 'logo-dark') {
          if (img.width < 200 || img.height < 50) {
            resolve({ valid: false, error: 'Logo must be at least 200x50 pixels.' });
            return;
          }
        }

        // Sidebar icons (any variant)
        if (type === 'sidebar-icon' || type === 'sidebar-icon-light' || type === 'sidebar-icon-dark') {
          if (img.width < 64 || img.height < 64) {
            resolve({ valid: false, error: 'Sidebar icon must be at least 64x64 pixels.' });
            return;
          }
          // Check for square aspect ratio (allow 10% tolerance)
          const aspectRatio = img.width / img.height;
          if (aspectRatio < 0.9 || aspectRatio > 1.1) {
            resolve({ valid: false, error: 'Sidebar icon must be square (1:1 aspect ratio).' });
            return;
          }
        }

        if (type === 'favicon') {
          if (img.width > 128 || img.height > 128) {
            resolve({ valid: false, error: 'Favicon should be 128x128 pixels or smaller.' });
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
