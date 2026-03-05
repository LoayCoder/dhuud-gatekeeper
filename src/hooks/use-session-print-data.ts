import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchDocumentSettings } from '@/hooks/use-document-branding';
import type { DocumentBrandingSettings } from '@/types/document-branding';

export interface SessionPhotoData {
  id: string;
  response_id: string;
  storage_path: string;
  file_name: string;
  caption: string | null;
  base64?: string;
}

export interface SessionPrintData {
  session: {
    id: string;
    reference_id: string | null;
    period: string;
    status: string;
    template?: { name: string; name_ar?: string | null };
    site?: { name: string };
    inspector?: { full_name: string };
    started_at: string | null;
    completed_at: string | null;
    compliance_percentage: number | null;
    total_assets?: number;
    passed_count?: number;
    failed_count?: number;
    not_accessible_count?: number;
    tenant_id: string;
    weather_conditions?: string | null;
    scope_notes?: string | null;
    attendees?: Array<{ name: string; role?: string }>;
  } | null;
  templateItems: Array<{
    id: string;
    question: string;
    question_ar?: string | null;
    is_critical: boolean;
    sort_order: number;
  }>;
  responses: Array<{
    id: string;
    template_item_id: string;
    result: string | null;
    notes: string | null;
    response_value?: string | null;
  }>;
  photosByResponse: Map<string, SessionPhotoData[]>;
  findings: Array<{
    id: string;
    reference_id: string;
    classification: string;
    risk_level: string | null;
    status: string | null;
    description: string | null;
    recommendation: string | null;
  }>;
  actions: Array<{
    id: string;
    title: string;
    status: string;
    priority: string | null;
    due_date: string | null;
    assigned_user?: { full_name: string } | null;
  }>;
  brandingSettings: DocumentBrandingSettings | null;
  isLoading: boolean;
  error: Error | null;
}

// Fetch all photos for a session and convert to base64
async function fetchSessionPhotosWithBase64(sessionId: string, tenantId: string): Promise<Map<string, SessionPhotoData[]>> {
  const { data: photos, error } = await supabase
    .from('area_inspection_photos')
    .select('id, response_id, storage_path, file_name, caption')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  
  if (error || !photos) {
    console.error('Error fetching photos:', error);
    return new Map();
  }
  
  // Filter photos that belong to this session's responses
  const { data: responses } = await supabase
    .from('area_inspection_responses')
    .select('id')
    .eq('session_id', sessionId)
    .is('deleted_at', null);
  
  const responseIds = new Set(responses?.map(r => r.id) || []);
  const sessionPhotos = photos.filter(p => responseIds.has(p.response_id));
  
  // Get signed URLs and convert to base64
  const photosWithBase64: SessionPhotoData[] = await Promise.all(
    sessionPhotos.map(async (photo) => {
      try {
        const { data: signedUrl } = await supabase.storage
          .from('inspection-files')
          .createSignedUrl(photo.storage_path, 3600);
        
        if (signedUrl?.signedUrl) {
          // Convert to base64 for PDF embedding
          const base64 = await urlToBase64(signedUrl.signedUrl);
          return { ...photo, base64 };
        }
      } catch (e) {
        console.warn('Failed to load photo:', photo.storage_path, e);
      }
      return photo;
    })
  );
  
  // Group by response_id
  const grouped = new Map<string, SessionPhotoData[]>();
  for (const photo of photosWithBase64) {
    const existing = grouped.get(photo.response_id) || [];
    existing.push(photo);
    grouped.set(photo.response_id, existing);
  }
  
  return grouped;
}

// Convert URL to base64
async function urlToBase64(url: string): Promise<string | undefined> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

// Fetch findings for a session
async function fetchSessionFindings(sessionId: string) {
  const { data, error } = await supabase
    .from('area_inspection_findings')
    .select('id, reference_id, classification, risk_level, status, description, recommendation')
    .eq('session_id', sessionId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching findings:', error);
    return [];
  }
  
  return data || [];
}

// Fetch corrective actions linked to findings from this session
async function fetchSessionActions(sessionId: string) {
  // First get finding IDs for this session
  const { data: findings } = await supabase
    .from('area_inspection_findings')
    .select('corrective_action_id')
    .eq('session_id', sessionId)
    .is('deleted_at', null)
    .not('corrective_action_id', 'is', null);
  
  const actionIds = findings?.map(f => f.corrective_action_id).filter(Boolean) || [];
  
  if (actionIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from('corrective_actions')
    .select(`
      id, title, status, priority, due_date,
      assigned_to:profiles!corrective_actions_assigned_to_fkey(full_name)
    `)
    .in('id', actionIds)
    .is('deleted_at', null);
  
  if (error) {
    console.error('Error fetching actions:', error);
    return [];
  }
  
  return (data || []).map(a => ({
    id: a.id,
    title: a.title,
    status: a.status,
    priority: a.priority,
    due_date: a.due_date,
    assigned_user: a.assigned_to ? { full_name: (a.assigned_to as any).full_name } : null
  }));
}

export function useSessionPrintData(sessionId: string | undefined, tenantId: string | undefined) {
  return useQuery({
    queryKey: ['session-print-data', sessionId, tenantId],
    queryFn: async (): Promise<Omit<SessionPrintData, 'isLoading' | 'error'>> => {
      if (!sessionId || !tenantId) {
        throw new Error('Session ID and Tenant ID are required');
      }
      
      // Fetch all data in parallel
      const [photosMap, findings, actions, brandingSettings] = await Promise.all([
        fetchSessionPhotosWithBase64(sessionId, tenantId),
        fetchSessionFindings(sessionId),
        fetchSessionActions(sessionId),
        fetchDocumentSettings(tenantId),
      ]);
      
      return {
        session: null, // Will be passed from parent
        templateItems: [], // Will be passed from parent
        responses: [], // Will be passed from parent
        photosByResponse: photosMap,
        findings,
        actions,
        brandingSettings,
      };
    },
    enabled: !!sessionId && !!tenantId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

// Helper to prepare full print data
export async function prepareFullPrintData(
  sessionId: string,
  tenantId: string,
  session: SessionPrintData['session'],
  templateItems: SessionPrintData['templateItems'],
  responses: SessionPrintData['responses']
): Promise<SessionPrintData> {
  const [photosMap, findings, actions, brandingSettings] = await Promise.all([
    fetchSessionPhotosWithBase64(sessionId, tenantId),
    fetchSessionFindings(sessionId),
    fetchSessionActions(sessionId),
    fetchDocumentSettings(tenantId),
  ]);
  
  return {
    session,
    templateItems,
    responses,
    photosByResponse: photosMap,
    findings,
    actions,
    brandingSettings,
    isLoading: false,
    error: null,
  };
}
