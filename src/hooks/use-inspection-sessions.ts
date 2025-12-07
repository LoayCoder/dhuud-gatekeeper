import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Types
export interface InspectionSession {
  id: string;
  tenant_id: string;
  session_type: 'asset' | 'area' | 'audit';
  template_id: string;
  period: string;
  site_id: string | null;
  building_id: string | null;
  floor_zone_id: string | null;
  category_id: string | null;
  type_id: string | null;
  status: 'draft' | 'in_progress' | 'completed_with_open_actions' | 'closed';
  started_at: string | null;
  completed_at: string | null;
  closed_at: string | null;
  total_assets: number;
  inspected_count: number;
  passed_count: number;
  failed_count: number;
  not_accessible_count: number;
  compliance_percentage: number | null;
  ai_summary: string | null;
  ai_summary_generated_at: string | null;
  inspector_id: string;
  reference_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Area inspection extended fields
  scope_notes: string | null;
  weather_conditions: string | null;
  attendees: { name: string; role?: string }[] | null;
  gps_boundary: { lat: number; lng: number }[] | null;
  // Joined data
  template?: { name: string; name_ar: string | null };
  site?: { name: string };
  category?: { name: string; name_ar: string | null };
  type?: { name: string; name_ar: string | null };
  inspector?: { full_name: string };
}

export interface SessionAsset {
  id: string;
  tenant_id: string;
  session_id: string;
  asset_id: string;
  quick_result: 'good' | 'not_good' | 'not_accessible' | null;
  failure_reason: string | null;
  notes: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  photo_paths: string[];
  inspected_at: string | null;
  inspected_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined asset data
  asset?: {
    id: string;
    name: string;
    asset_code: string;
    serial_number: string | null;
    status: string;
    last_inspection_date: string | null;
    category?: { name: string; name_ar: string | null };
    type?: { name: string; name_ar: string | null };
    building?: { name: string };
    floor_zone?: { name: string };
  };
}

export interface InspectionFinding {
  id: string;
  tenant_id: string;
  session_id: string;
  session_asset_id: string | null;
  asset_id: string | null;
  classification: 'minor_nc' | 'major_nc' | 'critical_nc' | 'observation' | 'ofi';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ai_generated_description: string | null;
  action_id: string | null;
  status: 'open' | 'action_assigned' | 'action_completed' | 'closed';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined data
  asset?: { name: string; asset_code: string };
}

interface CreateSessionInput {
  session_type: 'asset' | 'area' | 'audit';
  template_id: string;
  period: string;
  site_id?: string | null;
  building_id?: string | null;
  floor_zone_id?: string | null;
  category_id?: string | null;
  type_id?: string | null;
}

interface RecordInspectionInput {
  session_asset_id: string;
  quick_result: 'good' | 'not_good' | 'not_accessible';
  failure_reason?: string | null;
  notes?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  photo_paths?: string[];
}

// Hook: Get all inspection sessions with filters
export function useInspectionSessions(filters?: { 
  status?: string; 
  site_id?: string;
  inspector_id?: string;
}) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['inspection-sessions', filters],
    queryFn: async () => {
      let query = supabase
        .from('inspection_sessions')
        .select(`
          *,
          template:inspection_templates(name, name_ar),
          site:sites(name),
          category:asset_categories(name, name_ar),
          type:asset_types(name, name_ar),
          inspector:profiles!inspection_sessions_inspector_id_fkey(full_name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.site_id) {
        query = query.eq('site_id', filters.site_id);
      }
      if (filters?.inspector_id) {
        query = query.eq('inspector_id', filters.inspector_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as InspectionSession[];
    },
    enabled: !!profile?.tenant_id,
  });
}

// Hook: Get single session with details
export function useInspectionSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['inspection-session', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      
      const { data, error } = await supabase
        .from('inspection_sessions')
        .select(`
          *,
          template:inspection_templates(name, name_ar),
          site:sites(name),
          category:asset_categories(name, name_ar),
          type:asset_types(name, name_ar),
          inspector:profiles!inspection_sessions_inspector_id_fkey(full_name)
        `)
        .eq('id', sessionId)
        .is('deleted_at', null)
        .single();
      
      if (error) throw error;
      return data as InspectionSession;
    },
    enabled: !!sessionId,
  });
}

// Hook: Create new session
export function useCreateSession() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: CreateSessionInput) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('inspection_sessions')
        .insert({
          ...input,
          tenant_id: profile.tenant_id,
          inspector_id: user.id,
          status: 'draft',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
    },
  });
}

// Hook: Start session (change status to in_progress and populate assets)
export function useStartSession() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      if (!profile?.tenant_id) throw new Error('Not authenticated');
      
      // Get session details to know filters
      const { data: session, error: sessionError } = await supabase
        .from('inspection_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (sessionError) throw sessionError;
      
      // Build asset query based on session filters
      let assetQuery = supabase
        .from('hsse_assets')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null);
      
      if (session.site_id) {
        assetQuery = assetQuery.eq('site_id', session.site_id);
      }
      if (session.building_id) {
        assetQuery = assetQuery.eq('building_id', session.building_id);
      }
      if (session.floor_zone_id) {
        assetQuery = assetQuery.eq('floor_zone_id', session.floor_zone_id);
      }
      if (session.category_id) {
        assetQuery = assetQuery.eq('category_id', session.category_id);
      }
      if (session.type_id) {
        assetQuery = assetQuery.eq('type_id', session.type_id);
      }
      
      const { data: assets, error: assetsError } = await assetQuery;
      if (assetsError) throw assetsError;
      
      // Insert all assets into session_assets
      const assetCount = assets?.length || 0;
      if (assets && assetCount > 0) {
        const sessionAssets = assets.map(asset => ({
          tenant_id: profile.tenant_id,
          session_id: sessionId,
          asset_id: asset.id,
        }));
        
        const { error: insertError } = await supabase
          .from('inspection_session_assets')
          .insert(sessionAssets);
        
        if (insertError) throw insertError;
      }
      
      // Update session status to in_progress and set total_assets count
      const { data, error } = await supabase
        .from('inspection_sessions')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          total_assets: assetCount,
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
      queryClient.invalidateQueries({ queryKey: ['session-assets', sessionId] });
    },
  });
}

// Hook: Get all assets in session
export function useSessionAssets(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-assets', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await supabase
        .from('inspection_session_assets')
        .select(`
          *,
          asset:hsse_assets(
            id, name, asset_code, serial_number, status, last_inspection_date,
            category:asset_categories(name, name_ar),
            type:asset_types(name, name_ar),
            building:buildings(name),
            floor_zone:floors_zones(name)
          )
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as SessionAsset[];
    },
    enabled: !!sessionId,
  });
}

// Hook: Get uninspected assets in session
export function useUninspectedAssets(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-assets-uninspected', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await supabase
        .from('inspection_session_assets')
        .select(`
          *,
          asset:hsse_assets(
            id, name, asset_code, serial_number, status, last_inspection_date,
            category:asset_categories(name, name_ar),
            type:asset_types(name, name_ar),
            building:buildings(name),
            floor_zone:floors_zones(name)
          )
        `)
        .eq('session_id', sessionId)
        .is('quick_result', null)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as SessionAsset[];
    },
    enabled: !!sessionId,
  });
}

// Hook: Get session asset by asset_id (for QR scan lookup)
export function useSessionAssetByAssetId(sessionId: string | undefined, assetId: string | undefined) {
  return useQuery({
    queryKey: ['session-asset-lookup', sessionId, assetId],
    queryFn: async () => {
      if (!sessionId || !assetId) return null;
      
      const { data, error } = await supabase
        .from('inspection_session_assets')
        .select(`
          *,
          asset:hsse_assets(
            id, name, asset_code, serial_number, status, last_inspection_date,
            category:asset_categories(name, name_ar),
            type:asset_types(name, name_ar),
            building:buildings(name),
            floor_zone:floors_zones(name)
          )
        `)
        .eq('session_id', sessionId)
        .eq('asset_id', assetId)
        .maybeSingle();
      
      if (error) throw error;
      return data as SessionAsset | null;
    },
    enabled: !!sessionId && !!assetId,
  });
}

// Hook: Record asset inspection result
export function useRecordAssetInspection() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: RecordInspectionInput) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('inspection_session_assets')
        .update({
          quick_result: input.quick_result,
          failure_reason: input.failure_reason || null,
          notes: input.notes || null,
          gps_lat: input.gps_lat || null,
          gps_lng: input.gps_lng || null,
          photo_paths: input.photo_paths || [],
          inspected_at: new Date().toISOString(),
          inspected_by: user.id,
        })
        .eq('id', input.session_asset_id)
        .select(`*, asset:hsse_assets(id)`)
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Get session_id from the returned data to invalidate correct queries
      queryClient.invalidateQueries({ queryKey: ['session-assets', data.session_id] });
      queryClient.invalidateQueries({ queryKey: ['session-assets-uninspected', data.session_id] });
      queryClient.invalidateQueries({ queryKey: ['inspection-session', data.session_id] });
      queryClient.invalidateQueries({ queryKey: ['session-progress', data.session_id] });
    },
  });
}

// Hook: Get session progress stats
export function useSessionProgress(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-progress', sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      
      const { data, error } = await supabase
        .from('inspection_sessions')
        .select('total_assets, inspected_count, passed_count, failed_count, not_accessible_count, compliance_percentage')
        .eq('id', sessionId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
    refetchInterval: 2000, // Poll every 2 seconds during active inspection
  });
}

// Hook: Complete session
export function useCompleteSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      // Check if there are any failed items (which means open actions)
      const { data: failedCount } = await supabase
        .from('inspection_session_assets')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('quick_result', 'not_good');
      
      const hasOpenActions = (failedCount as any)?.count > 0;
      
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
    },
  });
}

// Hook: Close session (after all actions are done)
export function useCloseSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from('inspection_sessions')
        .update({ status: 'closed', updated_at: new Date().toISOString() })
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

// Update an existing inspection session
export function useUpdateSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      updates 
    }: { 
      sessionId: string; 
      updates: Partial<{
        period: string;
        site_id: string | null;
        category_id: string | null;
        type_id: string | null;
      }>;
    }) => {
      const { data, error } = await supabase
        .from('inspection_sessions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['inspection-session', sessionId] });
    },
  });
}

// Soft delete an inspection session
export function useDeleteSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      // Soft delete the session
      const { error } = await supabase
        .from('inspection_sessions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', sessionId);
      
      if (error) throw error;
      return sessionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-sessions'] });
    },
  });
}

// Hook: Get session findings
export function useSessionFindings(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-findings', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const { data, error } = await supabase
        .from('inspection_findings')
        .select(`
          *,
          asset:hsse_assets(name, asset_code)
        `)
        .eq('session_id', sessionId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as InspectionFinding[];
    },
    enabled: !!sessionId,
  });
}

// Hook: Create finding
export function useCreateFinding() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (input: {
      session_id: string;
      session_asset_id?: string;
      asset_id?: string;
      classification: 'minor_nc' | 'major_nc' | 'critical_nc' | 'observation' | 'ofi';
      risk_level: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      ai_generated_description?: string;
    }) => {
      if (!profile?.tenant_id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('inspection_findings')
        .insert({
          ...input,
          tenant_id: profile.tenant_id,
          status: 'open',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['session-findings', data.session_id] });
    },
  });
}

// Hook: Update finding
export function useUpdateFinding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<InspectionFinding>) => {
      const { data, error } = await supabase
        .from('inspection_findings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['session-findings', data.session_id] });
    },
  });
}

// Hook: Add an asset to an in-progress session via QR scan
export function useAddAssetToSession() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async ({ sessionId, assetId }: { sessionId: string; assetId: string }) => {
      if (!profile?.tenant_id) throw new Error('Not authenticated');
      
      // Get session details to verify asset matches filters
      const { data: session, error: sessionError } = await supabase
        .from('inspection_sessions')
        .select('site_id, building_id, floor_zone_id, category_id, type_id')
        .eq('id', sessionId)
        .single();
      
      if (sessionError) throw sessionError;
      
      // Get asset details
      const { data: asset, error: assetError } = await supabase
        .from('hsse_assets')
        .select('id, site_id, building_id, floor_zone_id, category_id, type_id')
        .eq('id', assetId)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .single();
      
      if (assetError) throw new Error('Asset not found');
      
      // Verify asset matches session filters
      if (session.site_id && asset.site_id !== session.site_id) {
        throw new Error('Asset does not match session site filter');
      }
      if (session.building_id && asset.building_id !== session.building_id) {
        throw new Error('Asset does not match session building filter');
      }
      if (session.category_id && asset.category_id !== session.category_id) {
        throw new Error('Asset does not match session category filter');
      }
      if (session.type_id && asset.type_id !== session.type_id) {
        throw new Error('Asset does not match session type filter');
      }
      
      // Check if already in session
      const { data: existing } = await supabase
        .from('inspection_session_assets')
        .select('id')
        .eq('session_id', sessionId)
        .eq('asset_id', assetId)
        .maybeSingle();
      
      if (existing) {
        throw new Error('Asset already in session');
      }
      
      // Insert asset into session
      const { data, error } = await supabase
        .from('inspection_session_assets')
        .insert({
          tenant_id: profile.tenant_id,
          session_id: sessionId,
          asset_id: assetId,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update total_assets count
      const { data: currentSession } = await supabase
        .from('inspection_sessions')
        .select('total_assets')
        .eq('id', sessionId)
        .single();
      
      await supabase
        .from('inspection_sessions')
        .update({ total_assets: (currentSession?.total_assets || 0) + 1 })
        .eq('id', sessionId);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['session-assets', data.session_id] });
      queryClient.invalidateQueries({ queryKey: ['session-assets-uninspected', data.session_id] });
      queryClient.invalidateQueries({ queryKey: ['inspection-session', data.session_id] });
      queryClient.invalidateQueries({ queryKey: ['session-progress', data.session_id] });
    },
  });
}

// Hook: Refresh session assets (find new matching assets)
export function useRefreshSessionAssets() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (sessionId: string) => {
      if (!profile?.tenant_id) throw new Error('Not authenticated');
      
      // Get session details
      const { data: session, error: sessionError } = await supabase
        .from('inspection_sessions')
        .select('site_id, building_id, floor_zone_id, category_id, type_id')
        .eq('id', sessionId)
        .single();
      
      if (sessionError) throw sessionError;
      
      // Build asset query based on session filters
      let assetQuery = supabase
        .from('hsse_assets')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null);
      
      if (session.site_id) assetQuery = assetQuery.eq('site_id', session.site_id);
      if (session.building_id) assetQuery = assetQuery.eq('building_id', session.building_id);
      if (session.floor_zone_id) assetQuery = assetQuery.eq('floor_zone_id', session.floor_zone_id);
      if (session.category_id) assetQuery = assetQuery.eq('category_id', session.category_id);
      if (session.type_id) assetQuery = assetQuery.eq('type_id', session.type_id);
      
      const { data: allMatchingAssets, error: assetsError } = await assetQuery;
      if (assetsError) throw assetsError;
      
      // Get existing session assets
      const { data: existingAssets } = await supabase
        .from('inspection_session_assets')
        .select('asset_id')
        .eq('session_id', sessionId);
      
      const existingAssetIds = new Set(existingAssets?.map(a => a.asset_id) || []);
      const newAssets = allMatchingAssets?.filter(a => !existingAssetIds.has(a.id)) || [];
      
      if (newAssets.length === 0) {
        return { added: 0, sessionId };
      }
      
      // Insert new assets
      const sessionAssets = newAssets.map(asset => ({
        tenant_id: profile.tenant_id,
        session_id: sessionId,
        asset_id: asset.id,
      }));
      
      const { error: insertError } = await supabase
        .from('inspection_session_assets')
        .insert(sessionAssets);
      
      if (insertError) throw insertError;
      
      // Update total_assets count
      const newTotal = (existingAssets?.length || 0) + newAssets.length;
      await supabase
        .from('inspection_sessions')
        .update({ total_assets: newTotal })
        .eq('id', sessionId);
      
      return { added: newAssets.length, sessionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['session-assets', data.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['session-assets-uninspected', data.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['inspection-session', data.sessionId] });
      queryClient.invalidateQueries({ queryKey: ['session-progress', data.sessionId] });
    },
  });
}
