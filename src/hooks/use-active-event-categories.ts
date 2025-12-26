import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EventCategory {
  id: string;
  code: string;
  name_key: string;
  icon: string | null;
  sort_order: number;
}

export interface EventCategoryWithStatus extends EventCategory {
  is_active: boolean;
  is_override: boolean;
}

/**
 * Hook to fetch active event categories for the current tenant
 * Uses the get_active_event_categories database function
 */
export function useActiveEventCategories() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['active-event-categories', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase.rpc('get_active_event_categories', {
        p_tenant_id: tenantId
      });

      if (error) throw error;
      return (data || []) as EventCategory[];
    },
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Hook to fetch ALL event categories with their active status for admin management
 */
export function useAllEventCategoriesWithStatus() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['all-event-categories-status', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      // Fetch all categories
      const { data: categories, error: catError } = await supabase
        .from('hsse_event_categories')
        .select('id, code, name_key, icon, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order');

      if (catError) throw catError;

      // Fetch tenant overrides
      const { data: overrides, error: overrideError } = await supabase
        .from('tenant_event_category_overrides')
        .select('category_id, is_active')
        .eq('tenant_id', tenantId);

      if (overrideError) throw overrideError;

      // Merge data
      const overrideMap = new Map(overrides?.map(o => [o.category_id, o.is_active]) || []);
      
      return (categories || []).map(cat => ({
        ...cat,
        is_active: overrideMap.has(cat.id) ? overrideMap.get(cat.id)! : true,
        is_override: overrideMap.has(cat.id),
      })) as EventCategoryWithStatus[];
    },
    enabled: !!tenantId,
  });
}

/**
 * Hook to toggle a category's active status for the tenant
 */
export function useToggleEventCategory() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, isActive }: { categoryId: string; isActive: boolean }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { error } = await supabase.rpc('toggle_event_category', {
        p_tenant_id: tenantId,
        p_category_id: categoryId,
        p_is_active: isActive
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-event-categories'] });
      queryClient.invalidateQueries({ queryKey: ['all-event-categories-status'] });
    },
  });
}

/**
 * Hook to create a new tenant-specific event category
 */
export function useCreateEventCategory() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { code: string; name_key: string; name_ar?: string; icon?: string; sort_order?: number }) => {
      if (!tenantId) throw new Error('No tenant ID');
      
      const { error } = await supabase
        .from('hsse_event_categories')
        .insert({
          code: data.code,
          name_key: data.name_key,
          name_ar: data.name_ar || null,
          icon: data.icon || null,
          sort_order: data.sort_order || 100,
          is_active: true,
          tenant_id: tenantId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-event-categories'] });
      queryClient.invalidateQueries({ queryKey: ['all-event-categories-status'] });
    },
  });
}

/**
 * Hook to update an existing event category
 */
export function useUpdateEventCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, data }: { categoryId: string; data: { name_key?: string; name_ar?: string; icon?: string; sort_order?: number } }) => {
      const { error } = await supabase
        .from('hsse_event_categories')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', categoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-event-categories'] });
      queryClient.invalidateQueries({ queryKey: ['all-event-categories-status'] });
    },
  });
}

/**
 * Hook to delete (soft delete) an event category
 */
export function useDeleteEventCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('hsse_event_categories')
        .update({ is_active: false })
        .eq('id', categoryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-event-categories'] });
      queryClient.invalidateQueries({ queryKey: ['all-event-categories-status'] });
    },
  });
}
