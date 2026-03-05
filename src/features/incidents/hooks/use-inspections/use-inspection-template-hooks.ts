import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { InspectionTemplate, TemplateItem } from './types';

/**
 * Fetch inspection templates with optional type filter
 * @param templateType - Optional filter: 'asset' | 'area' | 'audit'
 */
export function useInspectionTemplates(templateType?: 'asset' | 'area' | 'audit') {
    const { profile } = useAuth();

    return useQuery({
        queryKey: ['inspection-templates', profile?.tenant_id, templateType],
        queryFn: async () => {
            let query = supabase
                .from('inspection_templates')
                .select(`
          id, tenant_id, code, name, name_ar, description,
          template_type, scope_description, estimated_duration_minutes, requires_photos, requires_gps,
          category_id, type_id, branch_id, site_id, version, is_active, created_by, created_at, updated_at,
          category:asset_categories(name, name_ar),
          type:asset_types(name, name_ar),
          branch:branches(name),
          site:sites(name)
        `)
                .is('deleted_at', null)
                .order('name');

            // Apply template type filter if provided
            if (templateType) {
                query = query.eq('template_type', templateType);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as unknown as InspectionTemplate[];
        },
        enabled: !!profile?.tenant_id,
        staleTime: 0, // Always refetch on mount - fixes caching issues
        gcTime: 0,    // Don't cache results
    });
}

export function useInspectionTemplate(templateId: string | undefined) {
    const { profile } = useAuth();

    return useQuery({
        queryKey: ['inspection-template', templateId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inspection_templates')
                .select(`
          id, tenant_id, code, name, name_ar, description,
          category_id, type_id, branch_id, site_id, version, is_active, created_by, created_at, updated_at,
          category:asset_categories(name, name_ar),
          type:asset_types(name, name_ar),
          branch:branches(name),
          site:sites(name)
        `)
                .eq('id', templateId!)
                .single();

            if (error) throw error;
            return data as unknown as InspectionTemplate;
        },
        enabled: !!templateId && !!profile?.tenant_id,
    });
}

export function useTemplateItems(templateId: string | undefined) {
    return useQuery({
        queryKey: ['template-items', templateId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inspection_template_items')
                .select('*')
                .eq('template_id', templateId!)
                .is('deleted_at', null)
                .order('sort_order');

            if (error) throw error;
            return data as TemplateItem[];
        },
        enabled: !!templateId,
    });
}

export function useTemplatesForAsset(categoryId: string | undefined, typeId: string | undefined) {
    return useQuery({
        queryKey: ['templates-for-asset', categoryId, typeId],
        queryFn: async () => {
            let query = supabase
                .from('inspection_templates')
                .select('id, name, name_ar, code, description')
                .eq('is_active', true)
                .is('deleted_at', null);

            // Filter by category/type if set, or get templates with no category/type (universal)
            if (categoryId || typeId) {
                query = query.or(
                    `category_id.is.null,category_id.eq.${categoryId || '00000000-0000-0000-0000-000000000000'}`
                );
            }

            const { data, error } = await query.order('name');

            if (error) throw error;
            return data;
        },
        enabled: true,
    });
}

export function useCreateTemplate() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async (data: {
            code: string;
            name: string;
            name_ar?: string;
            description?: string;
            template_type?: 'asset' | 'area' | 'audit';
            inspection_category_id?: string;
            area_type?: string;
            standard_reference?: string;
            passing_score_percentage?: number;
            estimated_duration_minutes?: number;
            requires_photos?: boolean;
            requires_gps?: boolean;
            category_id?: string;
            type_id?: string;
            branch_id?: string;
            site_id?: string;
            is_active?: boolean;
        }) => {
            // Fetch tenant_id at mutation time to avoid race condition
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('id, tenant_id')
                .eq('user_id', user.id)
                .single();

            if (!profile?.tenant_id) throw new Error('No tenant found');

            const { data: result, error } = await supabase
                .from('inspection_templates')
                .insert({
                    ...data,
                    tenant_id: profile.tenant_id,
                    created_by: profile.id,
                })
                .select()
                .single();

            if (error) throw error;
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inspection-templates'] });
            toast.success(t('inspections.templateCreated'));
        },
        onError: (error: Error) => {
            // Handle duplicate key constraint violation
            if (error.message.includes('duplicate key') ||
                error.message.includes('unique constraint') ||
                error.message.includes('inspection_templates_tenant_code_unique')) {
                toast.error(t('inspections.form.codeDuplicateError', 'A template with this code already exists. Please use a different code.'));
            } else {
                toast.error(error.message);
            }
        },
    });
}

export function useUpdateTemplate() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({ id, ...data }: {
            id: string;
            code?: string;
            name?: string;
            name_ar?: string;
            description?: string;
            template_type?: 'asset' | 'area' | 'audit';
            inspection_category_id?: string | null;
            area_type?: string | null;
            standard_reference?: string | null;
            passing_score_percentage?: number | null;
            estimated_duration_minutes?: number | null;
            requires_photos?: boolean;
            requires_gps?: boolean;
            category_id?: string | null;
            type_id?: string | null;
            branch_id?: string | null;
            site_id?: string | null;
            is_active?: boolean;
        }) => {
            const { data: result, error } = await supabase
                .from('inspection_templates')
                .update(data)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return result;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['inspection-templates'] });
            queryClient.invalidateQueries({ queryKey: ['inspection-template', variables.id] });
            toast.success(t('inspections.templateUpdated'));
        },
        onError: (error: Error) => {
            // Handle duplicate key constraint violation
            if (error.message.includes('duplicate key') ||
                error.message.includes('unique constraint') ||
                error.message.includes('inspection_templates_tenant_code_unique')) {
                toast.error(t('inspections.form.codeDuplicateError', 'A template with this code already exists. Please use a different code.'));
            } else {
                toast.error(error.message);
            }
        },
    });
}

export function useDeleteTemplate() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async (id: string) => {
            // Use SECURITY DEFINER function to bypass RLS issues
            const { error } = await supabase
                .rpc('soft_delete_inspection_template', { p_template_id: id });

            if (error) {
                console.error('[DeleteTemplate] Error:', error);
                throw error;
            }
        },
        onSuccess: () => {
            // Force hard refetch, not just invalidation - fixes caching issues
            queryClient.resetQueries({ queryKey: ['inspection-templates'] });
            toast.success(t('inspections.templateDeleted'));
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

// ============= Bulk Template Hooks =============

export function useBulkUpdateTemplateStatus() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({ ids, is_active }: { ids: string[]; is_active: boolean }) => {
            const { error } = await supabase
                .from('inspection_templates')
                .update({ is_active })
                .in('id', ids);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.resetQueries({ queryKey: ['inspection-templates'] });
            const message = variables.is_active
                ? t('inspections.templatesActivated', { count: variables.ids.length })
                : t('inspections.templatesDeactivated', { count: variables.ids.length });
            toast.success(message);
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

export function useBulkDeleteTemplates() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async (ids: string[]) => {
            // Call SECURITY DEFINER function for each template
            for (const id of ids) {
                const { error } = await supabase
                    .rpc('soft_delete_inspection_template', { p_template_id: id });

                if (error) {
                    console.error('[BulkDeleteTemplate] Error for id:', id, error);
                    throw error;
                }
            }
        },
        onSuccess: (_, ids) => {
            queryClient.resetQueries({ queryKey: ['inspection-templates'] });
            toast.success(t('inspections.templatesDeleted', { count: ids.length }));
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

export function useCreateTemplateItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: {
            template_id: string;
            question: string;
            question_ar?: string;
            response_type: string;
            sort_order: number;
            min_value?: number;
            max_value?: number;
            rating_scale?: number;
            is_critical?: boolean;
            is_required?: boolean;
            instructions?: string;
            instructions_ar?: string;
        }) => {
            // Fetch tenant_id at mutation time to avoid race condition
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('user_id', user.id)
                .single();

            if (!profile?.tenant_id) throw new Error('No tenant found');

            const { data: result, error } = await supabase
                .from('inspection_template_items')
                .insert({
                    ...data,
                    tenant_id: profile.tenant_id,
                })
                .select()
                .single();

            if (error) throw error;
            return result;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['template-items', variables.template_id] });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

export function useUpdateTemplateItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, template_id, ...data }: {
            id: string;
            template_id: string;
            question?: string;
            question_ar?: string;
            response_type?: string;
            sort_order?: number;
            min_value?: number | null;
            max_value?: number | null;
            rating_scale?: number;
            is_critical?: boolean;
            is_required?: boolean;
            instructions?: string;
            instructions_ar?: string;
        }) => {
            const { data: result, error } = await supabase
                .from('inspection_template_items')
                .update(data)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { ...result, template_id };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['template-items', data.template_id] });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

export function useDeleteTemplateItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, template_id }: { id: string; template_id: string }) => {
            const { error } = await supabase
                .from('inspection_template_items')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            return { template_id };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['template-items', data.template_id] });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}
