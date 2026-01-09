import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ApprovalCategory = 
  | 'incident'
  | 'gate_pass'
  | 'worker'
  | 'contractor'
  | 'visitor'
  | 'asset';

export interface UnifiedPendingApproval {
  id: string;
  reference_id: string;
  title: string;
  category: ApprovalCategory;
  sub_type?: string;
  status: string;
  created_at: string;
  updated_at: string;
  days_pending: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  requester_name?: string;
  department_name?: string;
  company_name?: string;
}

// Incident approval statuses
const INCIDENT_APPROVAL_STATUSES = [
  'pending_dept_rep_approval',
  'pending_dept_rep_incident_review',
  'pending_manager_approval',
  'pending_hsse_rejection_review',
  'pending_hsse_validation',
  'pending_legal_review',
] as const;

// Gate pass approval statuses
const GATE_PASS_APPROVAL_STATUSES = [
  'pending_pm_approval',
  'pending_safety_approval',
] as const;

// Worker approval statuses
const WORKER_APPROVAL_STATUSES = ['pending'] as const;

/**
 * Unified hook to fetch ALL pending approvals across the system
 * with tenant isolation
 */
export function useAllPendingApprovals(minDaysPending = 0) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['all-pending-approvals', minDaysPending, profile?.tenant_id],
    queryFn: async (): Promise<UnifiedPendingApproval[]> => {
      // CRITICAL: Tenant isolation
      if (!profile?.tenant_id) {
        return [];
      }

      const now = new Date();
      const allApprovals: UnifiedPendingApproval[] = [];

      // 1. Fetch incident approvals
      const { data: incidents } = await supabase
        .from('incidents')
        .select('id, reference_id, title, status, event_type, created_at, updated_at, department_id')
        .eq('tenant_id', profile.tenant_id)
        .or(INCIDENT_APPROVAL_STATUSES.map(s => `status.eq.${s}`).join(','))
        .is('deleted_at', null)
        .order('updated_at', { ascending: true });

      if (incidents) {
        // Get department names
        const deptIds = [...new Set(incidents.map(i => i.department_id).filter(Boolean))] as string[];
        let deptMap: Record<string, string> = {};
        if (deptIds.length > 0) {
          const { data: depts } = await supabase
            .from('departments')
            .select('id, name')
            .in('id', deptIds);
          if (depts) {
            deptMap = depts.reduce((acc, d) => ({ ...acc, [d.id]: d.name || '' }), {});
          }
        }

        incidents.forEach(incident => {
          const updatedAt = new Date(incident.updated_at);
          const daysPending = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
          
          allApprovals.push({
            id: incident.id,
            reference_id: incident.reference_id || '',
            title: incident.title,
            category: 'incident',
            sub_type: incident.event_type,
            status: incident.status,
            created_at: incident.created_at,
            updated_at: incident.updated_at,
            days_pending: daysPending,
            department_name: deptMap[incident.department_id] || '',
          });
        });
      }

      // 2. Fetch gate pass approvals
      const { data: gatePasses } = await supabase
        .from('material_gate_passes')
        .select('id, reference_number, material_description, status, created_at, updated_at, company_id, pass_type')
        .eq('tenant_id', profile.tenant_id)
        .or(GATE_PASS_APPROVAL_STATUSES.map(s => `status.eq.${s}`).join(','))
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (gatePasses && gatePasses.length > 0) {
        // Get company names
        const companyIds = [...new Set(gatePasses.map(g => g.company_id).filter(Boolean))] as string[];
        let companyMap: Record<string, string> = {};
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from('contractor_companies')
            .select('id, company_name')
            .in('id', companyIds);
          if (companies) {
            companyMap = companies.reduce((acc, c) => ({ ...acc, [c.id]: c.company_name || '' }), {});
          }
        }

        gatePasses.forEach(pass => {
          const createdAt = new Date(pass.created_at);
          const daysPending = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          
          allApprovals.push({
            id: pass.id,
            reference_id: pass.reference_number || '',
            title: pass.material_description || 'Gate Pass',
            category: 'gate_pass',
            sub_type: pass.pass_type,
            status: pass.status,
            created_at: pass.created_at,
            updated_at: pass.updated_at || pass.created_at,
            days_pending: daysPending,
            company_name: companyMap[pass.company_id] || '',
          });
        });
      }

      // 3. Fetch worker approvals
      const { data: workers } = await supabase
        .from('contractor_workers')
        .select('id, full_name, approval_status, created_at, updated_at, company_id, worker_type')
        .eq('tenant_id', profile.tenant_id)
        .eq('approval_status', 'pending')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (workers && workers.length > 0) {
        // Get company names
        const companyIds = [...new Set(workers.map(w => w.company_id).filter(Boolean))] as string[];
        let companyMap: Record<string, string> = {};
        if (companyIds.length > 0) {
          const { data: companies } = await supabase
            .from('contractor_companies')
            .select('id, company_name')
            .in('id', companyIds);
          if (companies) {
            companyMap = companies.reduce((acc, c) => ({ ...acc, [c.id]: c.company_name || '' }), {});
          }
        }

        workers.forEach(worker => {
          const createdAt = new Date(worker.created_at);
          const daysPending = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          
          allApprovals.push({
            id: worker.id,
            reference_id: worker.id.substring(0, 8).toUpperCase(),
            title: worker.full_name,
            category: 'worker',
            sub_type: worker.worker_type,
            status: 'pending_approval',
            created_at: worker.created_at,
            updated_at: worker.updated_at || worker.created_at,
            days_pending: daysPending,
            company_name: companyMap[worker.company_id] || '',
          });
        });
      }

      // 4. Fetch contractor company approvals (if they have pending status)
      const { data: contractors } = await supabase
        .from('contractor_companies')
        .select('id, company_name, status, created_at, updated_at')
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'pending')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (contractors) {
        contractors.forEach(contractor => {
          const createdAt = new Date(contractor.created_at);
          const daysPending = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          
          allApprovals.push({
            id: contractor.id,
            reference_id: contractor.id.substring(0, 8).toUpperCase(),
            title: contractor.company_name,
            category: 'contractor',
            status: 'pending_approval',
            created_at: contractor.created_at,
            updated_at: contractor.updated_at || contractor.created_at,
            days_pending: daysPending,
            company_name: contractor.company_name,
          });
        });
      }

      // 5. Fetch visitor approvals (active visitors that might need approval)
      // Note: Visitors typically don't have pending approval status in this schema
      // but we check for any that might be in a pending state

      // 6. Fetch asset purchase approvals
      const { data: assetApprovals } = await supabase
        .from('pending_approvals')
        .select('id, reference_id, reference_number, title, status, approval_type, created_at, updated_at, priority')
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (assetApprovals) {
        assetApprovals.forEach(approval => {
          const createdAt = new Date(approval.created_at);
          const daysPending = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          
          // Map approval_type to category
          let category: ApprovalCategory = 'asset';
          if (approval.approval_type?.includes('visitor')) category = 'visitor';
          else if (approval.approval_type?.includes('contractor')) category = 'contractor';
          else if (approval.approval_type?.includes('worker')) category = 'worker';
          else if (approval.approval_type?.includes('gate')) category = 'gate_pass';
          
          allApprovals.push({
            id: approval.id,
            reference_id: approval.reference_number || approval.reference_id || '',
            title: approval.title || 'Approval Request',
            category,
            sub_type: approval.approval_type,
            status: approval.status,
            created_at: approval.created_at,
            updated_at: approval.updated_at || approval.created_at,
            days_pending: daysPending,
            priority: approval.priority as any,
          });
        });
      }

      // Filter by minimum days pending
      return allApprovals.filter(a => a.days_pending >= minDaysPending);
    },
    enabled: !!profile?.tenant_id,
  });
}

/**
 * Get counts by category
 */
export function useApprovalCounts() {
  const { data: approvals } = useAllPendingApprovals(0);

  const counts = {
    total: approvals?.length || 0,
    incident: approvals?.filter(a => a.category === 'incident').length || 0,
    gate_pass: approvals?.filter(a => a.category === 'gate_pass').length || 0,
    worker: approvals?.filter(a => a.category === 'worker').length || 0,
    contractor: approvals?.filter(a => a.category === 'contractor').length || 0,
    visitor: approvals?.filter(a => a.category === 'visitor').length || 0,
    asset: approvals?.filter(a => a.category === 'asset').length || 0,
  };

  return counts;
}
