import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

// ============= Audit Session Types =============

export interface AuditTemplate {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  template_type: 'audit';
  scope_description: string | null;
  estimated_duration_minutes: number | null;
  requires_photos: boolean;
  requires_gps: boolean;
  standard_reference: string | null;
  passing_score_percentage: number | null;
  version: number;
  is_active: boolean;
  created_at: string;
}

export interface AuditTemplateItem {
  id: string;
  template_id: string;
  question: string;
  question_ar: string | null;
  response_type: string;
  clause_reference: string | null;
  scoring_weight: number;
  nc_category: 'minor' | 'major' | 'critical' | null;
  is_critical: boolean;
  is_required: boolean;
  instructions: string | null;
  instructions_ar: string | null;
  sort_order: number;
}

export interface AuditResponse {
  id: string;
  session_id: string;
  template_item_id: string;
  result: 'conforming' | 'non_conforming' | 'na' | null;
  response_value: string | null;
  notes: string | null;
  objective_evidence: string | null;
  nc_category: 'minor' | 'major' | 'critical' | null;
  photo_paths: string[];
  responded_at: string | null;
}

export interface CreateAuditSessionInput {
  template_id: string;
  period: string;
  site_id?: string | null;
  building_id?: string | null;
  floor_zone_id?: string | null;
  scope_notes?: string | null;
  audit_objective?: string | null;
  lead_auditor_id?: string | null;
  audit_team?: { name: string; role?: string }[];
}

export interface AuditProgress {
  total: number;
  responded: number;
  conforming: number;
  nonConforming: number;
  na: number;
  weightedScore: number;
  maxScore: number;
  percentage: number;
  passingThreshold: number;
  isPassing: boolean;
  hasBlockingNC: boolean;
}

export interface NCCounts {
  minor: number;
  major: number;
  critical: number;
  total: number;
}

// ============= Audit Template Hooks =============

export function useAuditTemplates() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['audit-templates', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspection_templates')
        .select(`
          id, tenant_id, code, name, name_ar, description,
          template_type, scope_description, estimated_duration_minutes, requires_photos, requires_gps,
          standard_reference, passing_score_percentage,
          version, is_active, created_at
        `)
        .eq('template_type', 'audit')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');
      
      if (error) throw error;
      return data as AuditTemplate[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useAuditTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ['audit-template', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      
      const { data, error } = await supabase
        .from('inspection_templates')
        .select(`
          id, tenant_id, code, name, name_ar, description,
          template_type, scope_description, estimated_duration_minutes, requires_photos, requires_gps,
          standard_reference, passing_score_percentage,
          version, is_active, created_at
        `)
        .eq('id', templateId)
        .single();
      
      if (error) throw error;
      return data as AuditTemplate;
    },
    enabled: !!templateId,
  });
}

export function useAuditTemplateItems(templateId: string | undefined) {
  return useQuery<AuditTemplateItem[]>({
    queryKey: ['audit-template-items', templateId],
    queryFn: async (): Promise<AuditTemplateItem[]> => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from('inspection_template_items')
        .select(`
          id, template_id, question, question_ar, response_type,
          clause_reference, scoring_weight, nc_category,
          is_critical, is_required, instructions, instructions_ar, sort_order
        `)
        .eq('template_id', templateId)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as AuditTemplateItem[];
    },
    enabled: !!templateId,
  });
}

// ============= Audit Session Hooks =============

export function useCreateAuditSession() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (input: CreateAuditSessionInput) => {
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
          attendees: input.audit_team || null,
          tenant_id: profile.tenant_id,
          inspector_id: input.lead_auditor_id || user.id,
          session_type: 'audit',
          status: 'draft',
          total_assets: 0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
      toast.success(t('audits.sessionCreated'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useStartAuditSession() {
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

// ============= Audit Response Hooks =============

export function useAuditResponses(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['audit-responses', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await supabase
        .from('area_inspection_responses')
        .select(`
          id, session_id, template_item_id,
          response_value, result, notes, photo_paths,
          gps_lat, gps_lng, responded_at
        `)
        .eq('session_id', sessionId)
        .order('created_at');
      
      if (error) throw error;
      
      // Map result to audit-specific fields
      return (data || []).map(item => ({
        id: item.id,
        session_id: item.session_id,
        template_item_id: item.template_item_id,
        result: item.result === 'pass' ? 'conforming' : item.result === 'fail' ? 'non_conforming' : item.result === 'na' ? 'na' : null,
        response_value: item.response_value,
        notes: item.notes,
        objective_evidence: null, // Stored in notes field
        nc_category: null, // Will be derived from template item
        photo_paths: Array.isArray(item.photo_paths) ? item.photo_paths : [],
        responded_at: item.responded_at,
      })) as AuditResponse[];
    },
    enabled: !!sessionId,
  });
}

export function useSaveAuditResponse() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  
  return useMutation({
    mutationFn: async (input: {
      session_id: string;
      template_item_id: string;
      result?: 'conforming' | 'non_conforming' | 'na';
      response_value?: string;
      notes?: string;
      objective_evidence?: string;
      nc_category?: 'minor' | 'major' | 'critical';
      photo_paths?: string[];
    }) => {
      if (!user?.id || !profile?.tenant_id) throw new Error('Not authenticated');
      
      // Map audit result to area response result
      const mappedResult = input.result === 'conforming' ? 'pass' : input.result === 'non_conforming' ? 'fail' : input.result === 'na' ? 'na' : null;
      
      // Combine notes and objective evidence
      const combinedNotes = input.objective_evidence 
        ? `${input.notes || ''}\n\n[Objective Evidence]: ${input.objective_evidence}`.trim()
        : input.notes || null;
      
      // Check if response already exists
      const { data: existing } = await supabase
        .from('area_inspection_responses')
        .select('id')
        .eq('session_id', input.session_id)
        .eq('template_item_id', input.template_item_id)
        .maybeSingle();
      
      const responseData = {
        response_value: input.response_value || null,
        result: mappedResult,
        notes: combinedNotes,
        photo_paths: input.photo_paths || [],
        responded_by: user.id,
        responded_at: new Date().toISOString(),
      };
      
      let responseRecord;
      
      if (existing) {
        const { data, error } = await supabase
          .from('area_inspection_responses')
          .update(responseData)
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        responseRecord = data;
      } else {
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
      
      // Auto-create finding on non-conforming result
      if (mappedResult === 'fail') {
        const { data: existingFinding } = await supabase
          .from('area_inspection_findings')
          .select('id')
          .eq('response_id', responseRecord.id)
          .is('deleted_at', null)
          .maybeSingle();
        
        if (!existingFinding) {
          await supabase
            .from('area_inspection_findings')
            .insert({
              tenant_id: profile.tenant_id,
              session_id: input.session_id,
              response_id: responseRecord.id,
              reference_id: '',
              classification: input.nc_category === 'critical' ? 'critical_nc' : input.nc_category === 'major' ? 'major_nc' : 'minor_nc',
              risk_level: input.nc_category === 'critical' ? 'critical' : input.nc_category === 'major' ? 'high' : 'medium',
              status: 'open',
              description: input.objective_evidence || input.notes || null,
              created_by: user.id,
            });
        }
      } else if (mappedResult === 'pass' || mappedResult === 'na') {
        // Close any existing finding
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
      queryClient.invalidateQueries({ queryKey: ['audit-responses', data.session_id] });
      queryClient.invalidateQueries({ queryKey: ['audit-progress', data.session_id] });
      queryClient.invalidateQueries({ queryKey: ['audit-nc-counts', data.session_id] });
      queryClient.invalidateQueries({ queryKey: ['area-findings', data.session_id] });
    },
  });
}

// ============= Audit Progress & Scoring Hooks =============

export function useAuditProgress(sessionId: string | undefined, templateId: string | undefined) {
  const { data: template } = useAuditTemplate(templateId);
  const { data: items = [] } = useAuditTemplateItems(templateId);
  const { data: responses = [] } = useAuditResponses(sessionId);
  
  return useQuery({
    queryKey: ['audit-progress', sessionId, templateId],
    queryFn: async (): Promise<AuditProgress | null> => {
      if (!sessionId || !templateId) return null;
      
      const responseMap = new Map(responses.map(r => [r.template_item_id, r]));
      
      let weightedScore = 0;
      let maxScore = 0;
      let conforming = 0;
      let nonConforming = 0;
      let na = 0;
      let responded = 0;
      let hasCriticalNC = false;
      
      for (const item of items) {
        const response = responseMap.get(item.id);
        const weight = item.scoring_weight || 1;
        
        if (response?.result) {
          responded++;
          
          if (response.result === 'conforming') {
            conforming++;
            weightedScore += weight;
            maxScore += weight;
          } else if (response.result === 'non_conforming') {
            nonConforming++;
            maxScore += weight;
            // Check for critical NC
            if (item.nc_category === 'critical' || item.is_critical) {
              hasCriticalNC = true;
            }
          } else if (response.result === 'na') {
            na++;
            // N/A items don't count toward score
          }
        } else {
          maxScore += weight;
        }
      }
      
      const percentage = maxScore > 0 ? (weightedScore / maxScore) * 100 : 0;
      const passingThreshold = template?.passing_score_percentage || 80;
      
      return {
        total: items.length,
        responded,
        conforming,
        nonConforming,
        na,
        weightedScore,
        maxScore,
        percentage,
        passingThreshold,
        isPassing: percentage >= passingThreshold && !hasCriticalNC,
        hasBlockingNC: hasCriticalNC,
      };
    },
    enabled: !!sessionId && !!templateId && items.length > 0,
    refetchInterval: 2000,
  });
}

export function useNCCounts(sessionId: string | undefined, templateId: string | undefined) {
  const { data: items = [] } = useAuditTemplateItems(templateId);
  const { data: responses = [] } = useAuditResponses(sessionId);
  
  return useQuery({
    queryKey: ['audit-nc-counts', sessionId, templateId],
    queryFn: async (): Promise<NCCounts> => {
      const responseMap = new Map(responses.map(r => [r.template_item_id, r]));
      
      let minor = 0;
      let major = 0;
      let critical = 0;
      
      for (const item of items) {
        const response = responseMap.get(item.id);
        
        if (response?.result === 'non_conforming') {
          const category = item.nc_category || (item.is_critical ? 'critical' : 'minor');
          if (category === 'critical') critical++;
          else if (category === 'major') major++;
          else minor++;
        }
      }
      
      return {
        minor,
        major,
        critical,
        total: minor + major + critical,
      };
    },
    enabled: !!sessionId && !!templateId && items.length > 0,
  });
}

export function useCompleteAuditSession() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      // Check if there are any non-conforming items
      const { data: failedResponses, count } = await supabase
        .from('area_inspection_responses')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('result', 'fail');
      
      const hasOpenActions = (count || 0) > 0;
      
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
      toast.success(t('audits.sessionCompleted'));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
