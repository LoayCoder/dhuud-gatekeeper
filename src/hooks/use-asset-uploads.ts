import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { compressImage } from '@/lib/upload-utils';
import type { Database } from '@/integrations/supabase/types';

type DocumentType = Database['public']['Enums']['asset_document_type'];

interface UploadPhotoParams {
  assetId: string;
  file: File;
  isPrimary?: boolean;
  caption?: string;
}

interface UploadDocumentParams {
  assetId: string;
  file: File;
  title: string;
  documentType: DocumentType;
  expiryDate?: string | null;
}

export function useUploadAssetPhoto() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async ({ assetId, file, isPrimary = false, caption }: UploadPhotoParams) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant or user');

      // Compress image before upload
      const compressedFile = await compressImage(file, 1920, 0.85);
      
      // Generate unique file path
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `${profile.tenant_id}/${assetId}/photos/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('asset-files')
        .upload(storagePath, compressedFile);

      if (uploadError) throw uploadError;

      // Create database record
      const { data, error: dbError } = await supabase
        .from('asset_photos')
        .insert({
          asset_id: assetId,
          tenant_id: profile.tenant_id,
          storage_path: storagePath,
          file_name: file.name,
          file_size: compressedFile.size,
          mime_type: compressedFile.type,
          is_primary: isPrimary,
          caption,
          uploaded_by: user.id,
        })
        .select('id')
        .single();

      if (dbError) {
        // Clean up storage on db error
        await supabase.storage.from('asset-files').remove([storagePath]);
        throw dbError;
      }

      return data;
    },
    onSuccess: (_, { assetId }) => {
      queryClient.invalidateQueries({ queryKey: ['asset-photos', assetId] });
    },
  });
}

export function useDeleteAssetPhoto() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (photoId: string) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      // Soft delete - set deleted_at
      const { error } = await supabase
        .from('asset_photos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', photoId)
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-photos'] });
    },
  });
}

export function useSetPrimaryPhoto() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ assetId, photoId }: { assetId: string; photoId: string }) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      // First, unset all other primary photos for this asset
      await supabase
        .from('asset_photos')
        .update({ is_primary: false })
        .eq('asset_id', assetId)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null);

      // Then set the new primary
      const { error } = await supabase
        .from('asset_photos')
        .update({ is_primary: true })
        .eq('id', photoId)
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;
    },
    onSuccess: (_, { assetId }) => {
      queryClient.invalidateQueries({ queryKey: ['asset-photos', assetId] });
    },
  });
}

export function useUploadAssetDocument() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async ({ assetId, file, title, documentType, expiryDate }: UploadDocumentParams) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant or user');

      // Generate unique file path
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `${profile.tenant_id}/${assetId}/documents/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('asset-files')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { data, error: dbError } = await supabase
        .from('asset_documents')
        .insert({
          asset_id: assetId,
          tenant_id: profile.tenant_id,
          storage_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          title,
          document_type: documentType,
          expiry_date: expiryDate || null,
          uploaded_by: user.id,
        })
        .select('id')
        .single();

      if (dbError) {
        // Clean up storage on db error
        await supabase.storage.from('asset-files').remove([storagePath]);
        throw dbError;
      }

      return data;
    },
    onSuccess: (_, { assetId }) => {
      queryClient.invalidateQueries({ queryKey: ['asset-documents', assetId] });
    },
  });
}

export function useDeleteAssetDocument() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (docId: string) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      // Soft delete - set deleted_at
      const { error } = await supabase
        .from('asset_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', docId)
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-documents'] });
    },
  });
}
