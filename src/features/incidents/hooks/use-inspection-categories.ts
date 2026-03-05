import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface InspectionTemplateCategory {
  id: string;
  tenant_id: string | null;
  code: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export function useInspectionTemplateCategories() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['inspection-template-categories', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspection_template_categories')
        .select('id, code, name, name_ar, description, description_ar, icon, color, sort_order, is_active, is_system')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as InspectionTemplateCategory[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useCreateInspectionCategory() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Omit<InspectionTemplateCategory, 'id' | 'created_at' | 'updated_at' | 'is_system'>) => {
      const { data: result, error } = await supabase
        .from('inspection_template_categories')
        .insert({
          ...data,
          tenant_id: profile!.tenant_id,
          is_system: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-template-categories'] });
      toast.success(t('inspections.categoryCreated'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateInspectionCategory() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<InspectionTemplateCategory> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('inspection_template_categories')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-template-categories'] });
      toast.success(t('inspections.categoryUpdated'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteInspectionCategory() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inspection_template_categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-template-categories'] });
      toast.success(t('inspections.categoryDeleted'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Area types for area inspections
export const AREA_TYPES = [
  { value: 'warehouse', labelKey: 'inspections.areaTypes.warehouse', icon: 'warehouse' },
  { value: 'accommodation', labelKey: 'inspections.areaTypes.accommodation', icon: 'home' },
  { value: 'site', labelKey: 'inspections.areaTypes.site', icon: 'hard-hat' },
  { value: 'building', labelKey: 'inspections.areaTypes.building', icon: 'building' },
  { value: 'office', labelKey: 'inspections.areaTypes.office', icon: 'briefcase' },
  { value: 'workshop', labelKey: 'inspections.areaTypes.workshop', icon: 'wrench' },
] as const;

export type AreaType = typeof AREA_TYPES[number]['value'];

// Template types
export const TEMPLATE_TYPES = [
  { value: 'asset', labelKey: 'inspections.types.asset' },
  { value: 'area', labelKey: 'inspections.types.area' },
  { value: 'audit', labelKey: 'inspections.types.audit' },
] as const;

export type TemplateType = typeof TEMPLATE_TYPES[number]['value'];
