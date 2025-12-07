import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { compressImage } from '@/lib/upload-utils';

interface InspectionPhoto {
  id: string;
  response_id: string;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  caption: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy: number | null;
  created_at: string | null;
}

interface UploadPhotoInput {
  file: File;
  responseId: string;
  sessionId: string;
  tenantId: string;
  caption?: string;
  gpsLat?: number;
  gpsLng?: number;
  gpsAccuracy?: number;
}

// Fetch photos for a specific response
export function useInspectionPhotos(responseId: string | undefined) {
  return useQuery({
    queryKey: ['inspection-photos', responseId],
    queryFn: async () => {
      if (!responseId) return [];
      
      const { data, error } = await supabase
        .from('area_inspection_photos')
        .select('id, response_id, storage_path, file_name, file_size, mime_type, caption, gps_lat, gps_lng, gps_accuracy, created_at')
        .eq('response_id', responseId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as InspectionPhoto[];
    },
    enabled: !!responseId,
  });
}

// Upload a photo
export function useUploadInspectionPhoto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: UploadPhotoInput) => {
      const { file, responseId, sessionId, tenantId, caption, gpsLat, gpsLng, gpsAccuracy } = input;
      
      // Compress image if it's an image file
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file, 1920, 0.85);
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;
      const storagePath = `${tenantId}/sessions/${sessionId}/${responseId}/${fileName}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('inspection-files')
        .upload(storagePath, fileToUpload, {
          contentType: fileToUpload.type,
          upsert: false,
        });
      
      if (uploadError) throw uploadError;
      
      // Create database record
      const { data, error: dbError } = await supabase
        .from('area_inspection_photos')
        .insert({
          tenant_id: tenantId,
          response_id: responseId,
          storage_path: storagePath,
          file_name: file.name,
          file_size: fileToUpload.size,
          mime_type: fileToUpload.type,
          caption: caption || null,
          gps_lat: gpsLat || null,
          gps_lng: gpsLng || null,
          gps_accuracy: gpsAccuracy || null,
        })
        .select('id, storage_path')
        .single();
      
      if (dbError) {
        // Clean up uploaded file on DB error
        await supabase.storage.from('inspection-files').remove([storagePath]);
        throw dbError;
      }
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inspection-photos', variables.responseId] });
    },
  });
}

// Delete a photo (soft delete)
export function useDeleteInspectionPhoto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ photoId, responseId }: { photoId: string; responseId: string }) => {
      const { error } = await supabase
        .from('area_inspection_photos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', photoId);
      
      if (error) throw error;
      return { photoId, responseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspection-photos', data.responseId] });
    },
  });
}

// Get signed URL for viewing a photo
export async function getPhotoUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('inspection-files')
    .createSignedUrl(storagePath, 3600); // 1 hour expiry
  
  return data?.signedUrl || null;
}
