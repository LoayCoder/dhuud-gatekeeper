import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { uploadFilesParallel } from '@/lib/upload-utils';

export function useCloseObservationOnSpot() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      incidentId,
      notes,
      photos,
    }: {
      incidentId: string;
      notes: string;
      photos: File[];
    }) => {
      if (!profile?.tenant_id) {
        throw new Error('User tenant not found');
      }

      // 1. Upload photos if any
      const closedOnSpotPaths: string[] = [];
      if (photos.length > 0) {
        await uploadFilesParallel(
          photos,
          async (file, index) => {
            const fileName = `${Date.now()}-${index}-${file.name}`;
            const uploadPath = `${profile.tenant_id}/${incidentId}/closed-on-spot/${fileName}`;
            const { error } = await supabase.storage
              .from('incident-attachments')
              .upload(uploadPath, file);
            if (error) throw error;
            closedOnSpotPaths.push(uploadPath);
          },
          { compressImages: true, maxWidth: 1920, quality: 0.85 }
        );
      }

      // 2. Update incident
      // We set immediate_actions_data with closed_on_spot: true
      // This should ideally allow the status transition to 'closed' if the trigger logic permits it
      const { data, error } = await supabase
        .from('incidents')
        .update({
          status: 'closed',
          immediate_actions: notes,
          immediate_actions_data: {
            closed_on_spot: true,
            photo_paths: closedOnSpotPaths,
          },
          // Mark as self-approved closure
          closure_approved_by: profile.id,
          closure_approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', incidentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      // Invalidate investigation query as well
      queryClient.invalidateQueries({ queryKey: ['investigation', incidentId] });

      toast({
        title: t('common.success'),
        description: t('investigation.observationClosedOnSpot', 'Observation closed on the spot successfully'),
      });
    },
    onError: (error) => {
      console.error('Failed to close observation:', error);
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
