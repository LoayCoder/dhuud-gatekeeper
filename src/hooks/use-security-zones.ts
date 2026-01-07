import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useSecurityZones(filters?: { siteId?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['security-zones', filters],
    queryFn: async () => {
      let query = supabase
        .from('security_zones')
        .select('*')
        .is('deleted_at', null)
        .order('zone_name');

      if (filters?.siteId) {
        query = query.eq('site_id', filters.siteId);
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSecurityZone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (zone: {
      zone_name: string;
      zone_code?: string;
      zone_type?: string;
      risk_level?: string;
      site_id?: string;
      is_active?: boolean;
      polygon_coords?: [number, number][] | null;
      geofence_radius_meters?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .eq('is_active', true)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      const { data, error } = await supabase
        .from('security_zones')
        .insert({ ...zone, tenant_id: profile.tenant_id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-zones'] });
      toast({ title: 'Zone created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create zone', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateSecurityZone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('security_zones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-zones'] });
      toast({ title: 'Zone updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update zone', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteSecurityZone() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('security_zones')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-zones'] });
      toast({ title: 'Zone deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete zone', description: error.message, variant: 'destructive' });
    },
  });
}
