import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface SpecialEvent {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  start_at: string;
  end_at: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SpecialEventFormData {
  name: string;
  description?: string;
  start_at: string;
  end_at: string;
  is_active: boolean;
}

// Fetch all events for admin management
export function useSpecialEvents() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['special-events', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      
      const { data, error } = await supabase
        .from('special_events')
        .select('id, name, description, start_at, end_at, is_active, created_at')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('start_at', { ascending: false });
      
      if (error) throw error;
      return data as SpecialEvent[];
    },
    enabled: !!profile?.tenant_id,
  });
}

// Fetch currently active event for reporters
export function useActiveEvent() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['active-special-event', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;
      
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('special_events')
        .select('id, name, description, start_at, end_at')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .lte('start_at', now)
        .gte('end_at', now)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as SpecialEvent | null;
    },
    enabled: !!profile?.tenant_id,
  });
}

// Create new event
export function useCreateSpecialEvent() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (data: SpecialEventFormData) => {
      if (!profile?.tenant_id) throw new Error('No tenant');
      
      const { data: result, error } = await supabase
        .from('special_events')
        .insert({
          tenant_id: profile.tenant_id,
          name: data.name,
          description: data.description || null,
          start_at: data.start_at,
          end_at: data.end_at,
          is_active: data.is_active,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['special-events'] });
      queryClient.invalidateQueries({ queryKey: ['active-special-event'] });
      toast.success(t('specialEvents.eventCreated'));
    },
    onError: (error) => {
      toast.error(t('common.error'));
      console.error('Create event error:', error);
    },
  });
}

// Update event
export function useUpdateSpecialEvent() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SpecialEventFormData> }) => {
      const { data: result, error } = await supabase
        .from('special_events')
        .update({
          name: data.name,
          description: data.description || null,
          start_at: data.start_at,
          end_at: data.end_at,
          is_active: data.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['special-events'] });
      queryClient.invalidateQueries({ queryKey: ['active-special-event'] });
      toast.success(t('specialEvents.eventUpdated'));
    },
    onError: (error) => {
      toast.error(t('common.error'));
      console.error('Update event error:', error);
    },
  });
}

// Soft delete event
export function useDeleteSpecialEvent() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('special_events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['special-events'] });
      queryClient.invalidateQueries({ queryKey: ['active-special-event'] });
      toast.success(t('specialEvents.eventDeleted'));
    },
    onError: (error) => {
      toast.error(t('common.error'));
      console.error('Delete event error:', error);
    },
  });
}
