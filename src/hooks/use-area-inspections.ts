import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { TemplateItem } from './use-inspections';

// ============= Area Inspection Types =============

export interface AreaInspectionResponse {
  id: string;
  tenant_id: string;
  session_id: string;
  template_item_id: string;
  response_value: string | null;
  result: 'pass' | 'fail' | 'na' | null;
  notes: string | null;
  photo_paths: string[];
  gps_lat: number | null;
  gps_lng: number | null;
  gps_accuracy: number | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  template_item?: TemplateItem;
  responder?: { full_name: string };
}

export interface AreaTemplate {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  template_type: 'asset' | 'area' | 'audit';
  scope_description: string | null;
  estimated_duration_minutes: number | null;
  requires_photos: boolean;
  requires_gps: boolean;
  category_id: string | null;
  type_id: string | null;
  branch_id: string | null;
  site_id: string | null;
  version: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: { name: string; name_ar: string | null };
  type?: { name: string; name_ar: string | null };
  branch?: { name: string };
  site?: { name: string };
}

export interface CreateAreaSessionInput {
  template_id: string;
  period: string;
  site_id?: string | null;
  building_id?: string | null;
  floor_zone_id?: string | null;
  scope_notes?: string | null;
  weather_conditions?: string | null;
  attendees?: { name: string; role?: string }[];
  gps_boundary?: { lat: number; lng: number }[];
}

export interface SaveAreaResponseInput {
  session_id: string;
  template_item_id: string;
  result?: 'pass' | 'fail' | 'na';
  response_value?: string;
  notes?: string;
  photo_paths?: string[];
  gps_lat?: number;
  gps_lng?: number;
  gps_accuracy?: number;
}

export interface AreaChecklistProgress {
  total: number;
  responded: number;
  passed: number;
  failed: number;
  na: number;
  percentage: number;
}

// ============= Area Template Hooks =============

/**
 * Fetch templates where template_type = 'area'
 */
export function useAreaTemplates() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['area-templates', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
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
        .eq('template_type', 'area')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');
      
      if (error) throw error;
      return data as unknown as AreaTemplate[];
    },
    enabled: !!profile?.tenant_id,
  });
}

/**
 * Fetch single area template with items
 */
export function useAreaTemplate(templateId: string | undefined) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['area-template', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
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
        .eq('id', templateId!)
        .eq('template_type', 'area')
        .single();
      
      if (error) throw error;
      return data as unknown as AreaTemplate;
    },
    enabled: !!templateId && !!profile?.tenant_id,
  });
}

// ============= Area Session Hooks =============

/**
 * Create new area inspection session with extended fields
 */
export function useCreateAreaSession() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (input: CreateAreaSessionInput) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('inspection_sessions')
        .insert({
          template_id: input.template_id,
          period: input.period,
          site_id: input.site_id || null,
          building_id: input.building_id || null,
          floor_zone_id: input.floor_zone_id || null,
          scope_notes: input.scope_notes || null,
          weather_conditions: input.weather_conditions || null,
          attendees: input.attendees || null,
          gps_boundary: input.gps_boundary || null,
          tenant_id: profile.tenant_id,
          inspector_id: user.id,
          session_type: 'area',
          status: 'draft',
          total_assets: 0, // Area sessions don't have assets
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
      toast.success(t('inspections.sessionCreated'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Start area session (update status to in_progress)
 * Unlike asset sessions, area sessions don't populate assets
 */
export function useStartAreaSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from('inspection_sessions')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['inspection-session', sessionId] });
    },
  });
}

// ============= Area Response Hooks =============

/**
 * Fetch all checklist responses for an area session
 */
export function useAreaInspectionResponses(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['area-inspection-responses', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await supabase
        .from('area_inspection_responses')
        .select(`
          id, tenant_id, session_id, template_item_id,
          response_value, result, notes, photo_paths,
          gps_lat, gps_lng, gps_accuracy,
          responded_by, responded_at, created_at, updated_at,
          template_item:inspection_template_items(
            id, question, question_ar, response_type, min_value, max_value,
            rating_scale, is_critical, is_required, instructions, instructions_ar, sort_order
          ),
          responder:profiles!area_inspection_responses_responded_by_fkey(full_name)
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Parse photo_paths from JSONB
      return (data || []).map(item => ({
        ...item,
        photo_paths: Array.isArray(item.photo_paths) ? item.photo_paths : [],
      })) as AreaInspectionResponse[];
    },
    enabled: !!sessionId,
  });
}

/**
 * Save/update individual checklist response with photos & GPS (upsert)
 */
export function useSaveAreaResponse() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  
  return useMutation({
    mutationFn: async (input: SaveAreaResponseInput) => {
      if (!user?.id || !profile?.tenant_id) throw new Error('Not authenticated');
      
      // Check if response already exists
      const { data: existing } = await supabase
        .from('area_inspection_responses')
        .select('id')
        .eq('session_id', input.session_id)
        .eq('template_item_id', input.template_item_id)
        .maybeSingle();
      
      const responseData = {
        response_value: input.response_value || null,
        result: input.result || null,
        notes: input.notes || null,
        photo_paths: input.photo_paths || [],
        gps_lat: input.gps_lat || null,
        gps_lng: input.gps_lng || null,
        gps_accuracy: input.gps_accuracy || null,
        responded_by: user.id,
        responded_at: new Date().toISOString(),
      };
      
      let responseRecord;
      
      if (existing) {
        // Update existing response
        const { data, error } = await supabase
          .from('area_inspection_responses')
          .update(responseData)
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        responseRecord = data;
      } else {
        // Insert new response
        const { data, error } = await supabase
          .from('area_inspection_responses')
          .insert({
            ...responseData,
            session_id: input.session_id,
            template_item_id: input.template_item_id,
            tenant_id: profile.tenant_id,
          })
          .select()
          .single();
        
        if (error) throw error;
        responseRecord = data;
      }
      
      // Auto-create finding on FAIL result
      if (input.result === 'fail') {
        // Check if finding already exists
        const { data: existingFinding } = await supabase
          .from('area_inspection_findings')
          .select('id')
          .eq('response_id', responseRecord.id)
          .is('deleted_at', null)
          .maybeSingle();
        
        if (!existingFinding) {
          // Create new finding
          await supabase
            .from('area_inspection_findings')
            .insert({
              tenant_id: profile.tenant_id,
              session_id: input.session_id,
              response_id: responseRecord.id,
              reference_id: '', // Will be set by trigger
              classification: 'observation',
              risk_level: 'medium',
              status: 'open',
              created_by: user.id,
            });
        }
      } else if (input.result === 'pass' || input.result === 'na') {
        // Close any existing finding if result changed to pass/na
        await supabase
          .from('area_inspection_findings')
          .update({
            status: 'closed',
            closed_at: new Date().toISOString(),
            closed_by: user.id,
          })
          .eq('response_id', responseRecord.id)
          .eq('status', 'open')
          .is('deleted_at', null);
      }
      
      return responseRecord;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['area-inspection-responses', data.session_id] });
      queryClient.invalidateQueries({ queryKey: ['area-checklist-progress', data.session_id] });
      queryClient.invalidateQueries({ queryKey: ['area-findings', data.session_id] });
      queryClient.invalidateQueries({ queryKey: ['area-findings-count', data.session_id] });
    },
  });
}

/**
 * Get pass/fail/pending stats for checklist items in an area session
 */
export function useAreaChecklistProgress(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['area-checklist-progress', sessionId],
    queryFn: async (): Promise<AreaChecklistProgress | null> => {
      if (!sessionId) return null;
      
      // First get the session to find the template_id
      const { data: session, error: sessionError } = await supabase
        .from('inspection_sessions')
        .select('template_id')
        .eq('id', sessionId)
        .single();
      
      if (sessionError) throw sessionError;
      if (!session?.template_id) return null;
      
      // Count total items from template
      const { count: totalCount, error: itemsError } = await supabase
        .from('inspection_template_items')
        .select('id', { count: 'exact', head: true })
        .eq('template_id', session.template_id)
        .is('deleted_at', null);
      
      if (itemsError) throw itemsError;
      
      const total = totalCount || 0;
      
      // Get all responses for this session
      const { data: responses, error: responsesError } = await supabase
        .from('area_inspection_responses')
        .select('result')
        .eq('session_id', sessionId);
      
      if (responsesError) throw responsesError;
      
      // Calculate stats
      const responded = responses?.filter(r => r.result !== null).length || 0;
      const passed = responses?.filter(r => r.result === 'pass').length || 0;
      const failed = responses?.filter(r => r.result === 'fail').length || 0;
      const na = responses?.filter(r => r.result === 'na').length || 0;
      const percentage = total > 0 ? Math.round((responded / total) * 100) : 0;
      
      return {
        total,
        responded,
        passed,
        failed,
        na,
        percentage,
      };
    },
    enabled: !!sessionId,
    refetchInterval: 2000, // Poll every 2 seconds during active inspection
  });
}

/**
 * Complete area inspection session
 */
export function useCompleteAreaSession() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      // Check if there are any failed items
      const { data: failedResponses } = await supabase
        .from('area_inspection_responses')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('result', 'fail');
      
      const hasOpenActions = (failedResponses as any)?.count > 0;
      
      const { data, error } = await supabase
        .from('inspection_sessions')
        .update({
          status: hasOpenActions ? 'completed_with_open_actions' : 'closed',
          completed_at: new Date().toISOString(),
          closed_at: hasOpenActions ? null : new Date().toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['inspection-session', sessionId] });
      toast.success(t('inspections.sessionCompleted'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Update area session metadata (scope_notes, weather, attendees)
 */
export function useUpdateAreaSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      ...updates 
    }: { 
      sessionId: string;
      scope_notes?: string | null;
      weather_conditions?: string | null;
      attendees?: { name: string; role?: string }[] | null;
      gps_boundary?: { lat: number; lng: number }[] | null;
    }) => {
      const { data, error } = await supabase
        .from('inspection_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['inspection-session', data.id] });
    },
  });
}
