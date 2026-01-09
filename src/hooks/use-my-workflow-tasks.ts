import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Unified workflow hooks for My Actions page
 * All hooks enforce strict tenant isolation via profile.tenant_id
 */

// ============================================
// ASSIGNED INVESTIGATIONS
// ============================================
export interface MyAssignedInvestigation {
  id: string;
  incident_id: string;
  investigator_id: string;
  started_at: string | null;
  assigned_at: string | null;
  target_completion_date: string | null;
  escalation_level: number | null;
  incident: {
    id: string;
    reference_id: string | null;
    title: string;
    status: string | null;
    severity_v2: string | null;
    event_type: string | null;
    site?: { name: string } | null;
  } | null;
}

export function useMyAssignedInvestigations() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['my-assigned-investigations', profile?.tenant_id, user?.id],
    queryFn: async () => {
      // CRITICAL: Tenant isolation guard
      if (!profile?.tenant_id || !user?.id) {
        console.warn('SECURITY: Attempted query without tenant/user context');
        return [];
      }

      const { data, error } = await supabase
        .from('investigations')
        .select(`
          id, incident_id, investigator_id, started_at, assigned_at,
          target_completion_date, escalation_level
        `)
        .eq('tenant_id', profile.tenant_id) // MANDATORY tenant filter
        .eq('investigator_id', user.id)
        .is('deleted_at', null)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      // Fetch incident details separately to avoid deep type instantiation
      const investigationsWithIncidents = await Promise.all(
        (data || []).map(async (inv) => {
          const { data: incident } = await supabase
            .from('incidents')
            .select('id, reference_id, title, status, severity_v2, event_type')
            .eq('id', inv.incident_id)
            .eq('tenant_id', profile.tenant_id)
            .single();
          
          return { ...inv, incident };
        })
      );

      // Filter to only show active investigations (not closed)
      const activeInvestigations = investigationsWithIncidents.filter(inv => {
        const status = inv.incident?.status;
        return status && !['closed', 'rejected'].includes(status);
      });

      return activeInvestigations as MyAssignedInvestigation[];
    },
    enabled: !!profile?.tenant_id && !!user?.id,
    staleTime: 30000,
  });
}

// ============================================
// RISK ASSESSMENTS
// ============================================
export interface MyRiskAssessment {
  id: string;
  assessment_number: string | null;
  activity_name: string | null;
  activity_name_ar: string | null;
  status: string | null;
  overall_risk_rating: string | null;
  assessment_date: string | null;
  valid_until: string | null;
  next_review_date: string | null;
  created_at: string | null;
  project?: { project_name: string } | null;
  contractor?: { company_name: string } | null;
}

export function useMyRiskAssessments() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['my-risk-assessments', profile?.tenant_id, user?.id],
    queryFn: async () => {
      // CRITICAL: Tenant isolation guard
      if (!profile?.tenant_id || !user?.id) {
        console.warn('SECURITY: Attempted query without tenant/user context');
        return [];
      }

      const { data, error } = await supabase
        .from('risk_assessments')
        .select(`
          id, assessment_number, activity_name, activity_name_ar,
          status, overall_risk_rating, assessment_date, valid_until,
          next_review_date, created_at
        `)
        .eq('tenant_id', profile.tenant_id) // MANDATORY tenant filter
        .eq('created_by', user.id)
        .is('deleted_at', null)
        .in('status', ['draft', 'pending_approval', 'revision_required'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as MyRiskAssessment[];
    },
    enabled: !!profile?.tenant_id && !!user?.id,
    staleTime: 30000,
  });
}

// ============================================
// PTW PERMITS
// ============================================
export interface MyPTWPermit {
  id: string;
  reference_id: string | null;
  status: string | null;
  job_description: string | null;
  work_scope: string | null;
  planned_start_time: string | null;
  planned_end_time: string | null;
  extended_until: string | null;
  extension_count: number | null;
  requested_at: string | null;
  created_at: string | null;
  site?: { name: string } | null;
  project?: { project_name: string } | null;
  permit_type?: { name: string; name_ar: string | null } | null;
}

export function useMyPTWPermits() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['my-ptw-permits', profile?.tenant_id, user?.id],
    queryFn: async () => {
      // CRITICAL: Tenant isolation guard
      if (!profile?.tenant_id || !user?.id) {
        console.warn('SECURITY: Attempted query without tenant/user context');
        return [];
      }

      const { data, error } = await supabase
        .from('ptw_permits')
        .select(`
          id, reference_id, status, job_description, work_scope,
          planned_start_time, planned_end_time, extended_until,
          extension_count, requested_at, created_at
        `)
        .eq('tenant_id', profile.tenant_id) // MANDATORY tenant filter
        .eq('applicant_id', user.id)
        .is('deleted_at', null)
        .in('status', ['draft', 'pending_endorsement', 'pending_issue', 'issued', 'active', 'suspended'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as MyPTWPermit[];
    },
    enabled: !!profile?.tenant_id && !!user?.id,
    staleTime: 30000,
  });
}

// ============================================
// VISITOR REQUESTS (as host)
// ============================================
export interface MyVisitorRequest {
  id: string;
  status: string | null;
  valid_from: string | null;
  valid_until: string | null;
  security_notes: string | null;
  created_at: string | null;
  visitor?: {
    id: string;
    full_name: string | null;
    company_name: string | null;
    email: string | null;
  } | null;
  site?: { name: string } | null;
}

export function useMyVisitorRequests() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['my-visitor-requests', profile?.tenant_id, user?.id],
    queryFn: async () => {
      // CRITICAL: Tenant isolation guard
      if (!profile?.tenant_id || !user?.id) {
        console.warn('SECURITY: Attempted query without tenant/user context');
        return [];
      }

      const { data, error } = await supabase
        .from('visit_requests')
        .select(`
          id, status, valid_from, valid_until, security_notes, created_at,
          visitor:visitors(id, full_name, company_name, email),
          site:sites(name)
        `)
        .eq('tenant_id', profile.tenant_id) // MANDATORY tenant filter
        .eq('host_id', user.id)
        .is('deleted_at', null)
        // Filter by valid statuses - using neq to exclude completed/cancelled
        .neq('status', 'checked_out')
        .neq('status', 'expired')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as MyVisitorRequest[];
    },
    enabled: !!profile?.tenant_id && !!user?.id,
    staleTime: 30000,
  });
}

// ============================================
// SCHEDULED INSPECTIONS
// ============================================
export interface MyScheduledInspection {
  id: string;
  reference_id: string | null;
  name: string | null;
  name_ar: string | null;
  next_due: string | null;
  frequency_type: string | null;
  is_active: boolean | null;
  template?: { name: string; name_ar: string | null } | null;
  site?: { name: string } | null;
}

export function useMyScheduledInspections() {
  const { user, profile } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['my-scheduled-inspections', profile?.tenant_id, user?.id],
    queryFn: async () => {
      // CRITICAL: Tenant isolation guard
      if (!profile?.tenant_id || !user?.id) {
        console.warn('SECURITY: Attempted query without tenant/user context');
        return [];
      }

      const { data, error } = await supabase
        .from('inspection_schedules')
        .select(`
          id, reference_id, name, name_ar, next_due, frequency_type, is_active,
          template:inspection_templates(name, name_ar),
          site:sites(name)
        `)
        .eq('tenant_id', profile.tenant_id) // MANDATORY tenant filter
        .eq('assigned_inspector_id', user.id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('next_due', { ascending: true })
        .limit(50);

      if (error) throw error;
      return (data || []) as MyScheduledInspection[];
    },
    enabled: !!profile?.tenant_id && !!user?.id,
    staleTime: 30000,
  });
}

// ============================================
// MY GATE PASSES (created by me)
// ============================================
export interface MyGatePass {
  id: string;
  reference_number: string | null;
  pass_type: string | null;
  material_description: string | null;
  status: string | null;
  pass_date: string | null;
  created_at: string | null;
  entry_time: string | null;
  exit_time: string | null;
  project?: { project_name: string } | null;
}

export function useMyCreatedGatePasses() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['my-created-gate-passes', profile?.tenant_id, user?.id],
    queryFn: async () => {
      // CRITICAL: Tenant isolation guard
      if (!profile?.tenant_id || !user?.id) {
        console.warn('SECURITY: Attempted query without tenant/user context');
        return [];
      }

      const { data, error } = await supabase
        .from('material_gate_passes')
        .select(`
          id, reference_number, pass_type, material_description,
          status, pass_date, created_at, entry_time, exit_time,
          project:contractor_projects(project_name)
        `)
        .eq('tenant_id', profile.tenant_id) // MANDATORY tenant filter
        .eq('requested_by', user.id)
        .is('deleted_at', null)
        .in('status', ['pending_pm_approval', 'pending_safety_approval', 'approved', 'pending_entry', 'pending_exit'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as MyGatePass[];
    },
    enabled: !!profile?.tenant_id && !!user?.id,
    staleTime: 30000,
  });
}

// ============================================
// UNIFIED WORKFLOW STATS
// ============================================
export interface MyWorkflowStats {
  investigations: number;
  riskAssessments: number;
  ptwPermits: number;
  visitorRequests: number;
  scheduledInspections: number;
  gatePasses: number;
  overdueInspections: number;
}

export function useMyWorkflowStats() {
  const investigations = useMyAssignedInvestigations();
  const riskAssessments = useMyRiskAssessments();
  const ptwPermits = useMyPTWPermits();
  const visitorRequests = useMyVisitorRequests();
  const scheduledInspections = useMyScheduledInspections();
  const gatePasses = useMyCreatedGatePasses();

  const today = new Date().toISOString().split('T')[0];
  
  const overdueInspections = (scheduledInspections.data || []).filter(
    insp => insp.next_due && insp.next_due < today
  ).length;

  return {
    data: {
      investigations: investigations.data?.length || 0,
      riskAssessments: riskAssessments.data?.length || 0,
      ptwPermits: ptwPermits.data?.length || 0,
      visitorRequests: visitorRequests.data?.length || 0,
      scheduledInspections: scheduledInspections.data?.length || 0,
      gatePasses: gatePasses.data?.length || 0,
      overdueInspections,
    },
    isLoading: investigations.isLoading || riskAssessments.isLoading || 
               ptwPermits.isLoading || visitorRequests.isLoading || 
               scheduledInspections.isLoading || gatePasses.isLoading,
  };
}
