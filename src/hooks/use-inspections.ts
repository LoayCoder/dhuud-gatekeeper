import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface InspectionTemplate {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  // Area inspection fields
  template_type: 'asset' | 'area' | 'audit';
  scope_description: string | null;
  estimated_duration_minutes: number | null;
  requires_photos: boolean;
  requires_gps: boolean;
  // Location filters
  category_id: string | null;
  type_id: string | null;
  branch_id: string | null;
  site_id: string | null;
  version: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items?: TemplateItem[];
  category?: { name: string; name_ar: string | null };
  type?: { name: string; name_ar: string | null };
  branch?: { name: string };
  site?: { name: string };
}

export interface TemplateItem {
  id: string;
  template_id: string;
  tenant_id: string;
  sort_order: number;
  question: string;
  question_ar: string | null;
  response_type: 'pass_fail' | 'yes_no' | 'rating' | 'numeric' | 'text';
  min_value: number | null;
  max_value: number | null;
  rating_scale: number;
  is_critical: boolean;
  is_required: boolean;
  instructions: string | null;
  instructions_ar: string | null;
  created_at: string;
}

export interface AssetInspection {
  id: string;
  tenant_id: string;
  asset_id: string;
  template_id: string;
  reference_id: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  inspection_date: string;
  inspector_id: string;
  overall_result: 'pass' | 'fail' | 'partial' | null;
  summary_notes: string | null;
  linked_incident_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  template?: InspectionTemplate;
  inspector?: { full_name: string };
  asset?: { name: string; asset_code: string };
}

export interface InspectionResponse {
  id: string;
  inspection_id: string;
  template_item_id: string;
  tenant_id: string;
  response_value: string | null;
  result: 'pass' | 'fail' | 'na' | null;
  notes: string | null;
  photo_path: string | null;
  responded_at: string;
  template_item?: TemplateItem;
}

// ============= Template Hooks =============

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

// ============= Inspection Hooks =============

export function useAssetInspections(assetId: string | undefined) {
  return useQuery({
    queryKey: ['asset-inspections', assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_inspections')
        .select(`
          id, tenant_id, asset_id, template_id, reference_id, status,
          inspection_date, inspector_id, overall_result, summary_notes,
          linked_incident_id, completed_at, created_at, updated_at,
          template:inspection_templates(name, name_ar),
          inspector:profiles(full_name)
        `)
        .eq('asset_id', assetId!)
        .is('deleted_at', null)
        .order('inspection_date', { ascending: false });
      
      if (error) throw error;
      return data as unknown as AssetInspection[];
    },
    enabled: !!assetId,
  });
}

export function useInspection(inspectionId: string | undefined) {
  return useQuery({
    queryKey: ['inspection', inspectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_inspections')
        .select(`
          id, tenant_id, asset_id, template_id, reference_id, status,
          inspection_date, inspector_id, overall_result, summary_notes,
          linked_incident_id, completed_at, created_at, updated_at,
          template:inspection_templates(id, name, name_ar, code),
          inspector:profiles(full_name),
          asset:hsse_assets(name, asset_code)
        `)
        .eq('id', inspectionId!)
        .single();
      
      if (error) throw error;
      return data as unknown as AssetInspection;
    },
    enabled: !!inspectionId,
  });
}

export function useInspectionResponses(inspectionId: string | undefined) {
  return useQuery({
    queryKey: ['inspection-responses', inspectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspection_responses')
        .select(`
          id, inspection_id, template_item_id, tenant_id,
          response_value, result, notes, photo_path, responded_at,
          template_item:inspection_template_items(
            id, question, question_ar, response_type, min_value, max_value,
            rating_scale, is_critical, is_required, instructions, instructions_ar, sort_order
          )
        `)
        .eq('inspection_id', inspectionId!)
        .order('responded_at');
      
      if (error) throw error;
      return data as unknown as InspectionResponse[];
    },
    enabled: !!inspectionId,
  });
}

export function useStartInspection() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (data: {
      asset_id: string;
      template_id: string;
      inspection_date?: string;
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
        .from('asset_inspections')
        .insert({
          ...data,
          tenant_id: profile.tenant_id,
          inspector_id: user.id,
          inspection_date: data.inspection_date || new Date().toISOString().split('T')[0],
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asset-inspections', data.asset_id] });
      toast.success(t('inspections.inspectionStarted'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useSaveInspectionResponse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      inspection_id: string;
      template_item_id: string;
      response_value?: string;
      result?: 'pass' | 'fail' | 'na';
      notes?: string;
      photo_path?: string;
    }) => {
      // Upsert - update if exists, insert if not
      const { data: existing } = await supabase
        .from('inspection_responses')
        .select('id')
        .eq('inspection_id', data.inspection_id)
        .eq('template_item_id', data.template_item_id)
        .maybeSingle();
      
      if (existing) {
        const { data: result, error } = await supabase
          .from('inspection_responses')
          .update({
            response_value: data.response_value,
            result: data.result,
            notes: data.notes,
            photo_path: data.photo_path,
            responded_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return result;
      } else {
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
          .from('inspection_responses')
          .insert({
            ...data,
            tenant_id: profile.tenant_id,
          })
          .select()
          .single();
        
        if (error) throw error;
        return result;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inspection-responses', variables.inspection_id] });
    },
  });
}

export function useCompleteInspection() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async ({ id, overall_result, summary_notes }: {
      id: string;
      overall_result: 'pass' | 'fail' | 'partial';
      summary_notes?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('asset_inspections')
        .update({
          status: 'completed',
          overall_result,
          summary_notes,
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, asset:hsse_assets(id)')
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspection', data.id] });
      queryClient.invalidateQueries({ queryKey: ['asset-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['asset', (data as any).asset?.id] });
      queryClient.invalidateQueries({ queryKey: ['overdue-inspections'] });
      toast.success(t('inspections.inspectionCompleted'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCancelInspection() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: result, error } = await supabase
        .from('asset_inspections')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspection', data.id] });
      queryClient.invalidateQueries({ queryKey: ['asset-inspections', data.asset_id] });
      toast.success(t('inspections.inspectionCancelled'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// ============= Dashboard Hooks =============

export function useRecentInspections(limit: number = 5) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['recent-inspections', profile?.tenant_id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_inspections')
        .select(`
          id, reference_id, status, inspection_date, overall_result, completed_at,
          asset:hsse_assets(name, asset_code),
          inspector:profiles(full_name)
        `)
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('completed_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as unknown as AssetInspection[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useInspectionStats() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['inspection-stats', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_inspections')
        .select('overall_result')
        .eq('status', 'completed')
        .is('deleted_at', null);
      
      if (error) throw error;
      
      const total = data.length;
      const passed = data.filter(i => i.overall_result === 'pass').length;
      const failed = data.filter(i => i.overall_result === 'fail').length;
      const partial = data.filter(i => i.overall_result === 'partial').length;
      
      return {
        total,
        passed,
        failed,
        partial,
        complianceRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      };
    },
    enabled: !!profile?.tenant_id,
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
