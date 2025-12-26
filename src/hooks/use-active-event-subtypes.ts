import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EventSubtype {
  id: string;
  code: string;
  name_key: string;
  sort_order: number;
}

export interface EventSubtypeWithStatus extends EventSubtype {
  category_id: string;
  is_active: boolean;
  is_override: boolean;
}

/**
 * Hook to fetch active subtypes for a specific category
 * Uses the get_active_event_subtypes database function
 */
export function useActiveEventSubtypes(categoryCode: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['active-event-subtypes', tenantId, categoryCode],
    queryFn: async () => {
      if (!tenantId || !categoryCode) return [];
      
      const { data, error } = await supabase.rpc('get_active_event_subtypes', {
        p_tenant_id: tenantId,
        p_category_code: categoryCode
      });

      if (error) throw error;
      return (data || []) as EventSubtype[];
    },
    enabled: !!tenantId && !!categoryCode,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Hook to fetch ALL subtypes for a category with their active status for admin management
 */
export function useAllEventSubtypesWithStatus(categoryId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['all-event-subtypes-status', tenantId, categoryId],
    queryFn: async () => {
      if (!tenantId || !categoryId) return [];
      
      // Fetch all subtypes for this category
      const { data: subtypes, error: subError } = await supabase
        .from('hsse_event_subtypes')
        .select('id, category_id, code, name_key, sort_order, is_active')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('sort_order');

      if (subError) throw subError;

      // Fetch tenant overrides for these subtypes
      const subtypeIds = subtypes?.map(s => s.id) || [];
      const { data: overrides, error: overrideError } = await supabase
        .from('tenant_event_subtype_overrides')
        .select('subtype_id, is_active')
        .eq('tenant_id', tenantId)
        .in('subtype_id', subtypeIds);

      if (overrideError) throw overrideError;

      // Merge data
      const overrideMap = new Map(overrides?.map(o => [o.subtype_id, o.is_active]) || []);
      
      return (subtypes || []).map(sub => ({
        ...sub,
        is_active: overrideMap.has(sub.id) ? overrideMap.get(sub.id)! : true,
        is_override: overrideMap.has(sub.id),
      })) as EventSubtypeWithStatus[];
    },
    enabled: !!tenantId && !!categoryId,
  });
}

/**
 * Hook to toggle a subtype's active status for the tenant
 */
export function useToggleEventSubtype() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subtypeId, isActive }: { subtypeId: string; isActive: boolean }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { error } = await supabase.rpc('toggle_event_subtype', {
        p_tenant_id: tenantId,
        p_subtype_id: subtypeId,
        p_is_active: isActive
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-event-subtypes'] });
      queryClient.invalidateQueries({ queryKey: ['all-event-subtypes-status'] });
    },
  });
}

/**
 * Hook to create a new tenant-specific event subtype
 */
export function useCreateEventSubtype() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { category_id: string; code: string; name_key: string; name_ar?: string; sort_order?: number }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { error } = await supabase
        .from('hsse_event_subtypes')
        .insert({
          category_id: data.category_id,
          code: data.code,
          name_key: data.name_key,
          name_ar: data.name_ar || null,
          sort_order: data.sort_order || 100,
          is_active: true,
          tenant_id: tenantId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-event-subtypes'] });
      queryClient.invalidateQueries({ queryKey: ['all-event-subtypes-status'] });
    },
  });
}

/**
 * Hook to update an existing event subtype
 */
export function useUpdateEventSubtype() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subtypeId, data }: { subtypeId: string; data: { name_key?: string; name_ar?: string; sort_order?: number } }) => {
      const { error } = await supabase
        .from('hsse_event_subtypes')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subtypeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-event-subtypes'] });
      queryClient.invalidateQueries({ queryKey: ['all-event-subtypes-status'] });
    },
  });
}

/**
 * Hook to delete (soft delete) an event subtype
 */
export function useDeleteEventSubtype() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subtypeId: string) => {
      const { error } = await supabase
        .from('hsse_event_subtypes')
        .update({ is_active: false })
        .eq('id', subtypeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-event-subtypes'] });
      queryClient.invalidateQueries({ queryKey: ['all-event-subtypes-status'] });
    },
  });
}
