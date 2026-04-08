import { supabase } from '@/integrations/supabase/client';

export interface MobilizationFilters {
  search?: string;
  status?: string;
}

/**
 * Fetch contractor projects with their mobilization status.
 * Projects are the single source of truth — mobilizations are optional records.
 */
export async function getProjectsWithMobilization(
  tenantId: string,
  filters: MobilizationFilters = {},
  branchIds: string[],
  isAllBranchesMode: boolean
) {
  let query = supabase
    .from('contractor_projects')
    .select(`
      id, tenant_id, project_code, project_name, project_name_ar,
      site_id, company_id, project_manager_id, project_type,
      start_date, end_date, status, notes,
      branch_id, department_id,
      created_at, updated_at,
      site:sites(id, name, branch_id),
      company:contractor_companies(id, company_name),
      project_manager:profiles!contractor_projects_project_manager_id_fkey(full_name)
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters.search) {
    query = query.or(`project_name.ilike.%${filters.search}%,project_code.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Branch filtering
  let filtered = data || [];
  if (!isAllBranchesMode && branchIds && branchIds.length > 0) {
    filtered = filtered.filter((p: any) => {
      const siteBranchId = p.site?.branch_id || p.branch_id;
      return siteBranchId && branchIds.includes(siteBranchId);
    });
  }

  // Now fetch mobilizations for these projects
  const projectIds = filtered.map((p: any) => p.id);
  if (projectIds.length === 0) return [];

  const { data: mobilizations } = await supabase
    .from('project_mobilizations')
    .select('id, project_id, status, mobilization_percentage, pre_checks_completed, site_clearance_approved, risk_assessment_required, ptw_enabled, approved_by, approved_at')
    .in('project_id', projectIds)
    .is('deleted_at', null);

  const mobMap = new Map((mobilizations || []).map((m: any) => [m.project_id, m]));

  return filtered.map((project: any) => ({
    ...project,
    mobilization: mobMap.get(project.id) || null,
  }));
}

/**
 * Get a single project with its mobilization record
 */
export async function getProjectMobilizationDetail(projectId: string, tenantId: string) {
  const { data: project, error } = await supabase
    .from('contractor_projects')
    .select(`
      id, tenant_id, project_code, project_name, project_name_ar,
      site_id, company_id, project_manager_id, project_type,
      start_date, end_date, status, notes,
      branch_id, department_id,
      site:sites(id, name),
      company:contractor_companies(id, company_name, status),
      project_manager:profiles!contractor_projects_project_manager_id_fkey(full_name)
    `)
    .eq('id', projectId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single();

  if (error) throw error;

  // Get mobilization record
  const { data: mobilization } = await supabase
    .from('project_mobilizations')
    .select('*')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .maybeSingle();

  return { project, mobilization };
}

/**
 * Create or get a mobilization record for a project
 */
export async function ensureMobilization(projectId: string, tenantId: string, userId: string) {
  // Check if one already exists
  const { data: existing } = await supabase
    .from('project_mobilizations')
    .select('id')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('project_mobilizations')
    .insert({
      project_id: projectId,
      tenant_id: tenantId,
      created_by: userId,
      status: 'pending',
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update mobilization status fields
 */
export async function updateMobilization(
  mobilizationId: string,
  updates: {
    status?: string;
    pre_checks_completed?: boolean;
    site_clearance_approved?: boolean;
    ptw_enabled?: boolean;
    mobilization_percentage?: number;
    approved_by?: string;
    approved_at?: string;
    rejection_reason?: string;
  }
) {
  const { data, error } = await supabase
    .from('project_mobilizations')
    .update(updates as any)
    .eq('id', mobilizationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get clearance checks for a mobilization
 */
export async function getMobilizationClearances(mobilizationId: string) {
  const { data, error } = await supabase
    .from('ptw_clearance_checks')
    .select(`
      id, project_id, mobilization_id, requirement_name, requirement_name_ar, category,
      is_mandatory, status, approved_by, approved_at, comments, sort_order,
      approver:profiles!ptw_clearance_checks_approved_by_fkey(full_name)
    `)
    .eq('mobilization_id', mobilizationId)
    .is('deleted_at', null)
    .order('sort_order');

  if (error) throw error;
  return data;
}

/**
 * Approve a clearance check
 */
export async function approveClearanceCheck(checkId: string, userId: string, comments?: string) {
  const { data, error } = await supabase
    .from('ptw_clearance_checks')
    .update({
      status: 'approved',
      approved_by: userId,
      approved_at: new Date().toISOString(),
      comments,
    })
    .eq('id', checkId)
    .select('mobilization_id')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Reject a clearance check
 */
export async function rejectClearanceCheck(checkId: string, userId: string, comments: string) {
  const { data, error } = await supabase
    .from('ptw_clearance_checks')
    .update({
      status: 'rejected',
      approved_by: userId,
      approved_at: new Date().toISOString(),
      comments,
    })
    .eq('id', checkId)
    .select('mobilization_id')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Check if a project's mobilization is approved (for PTW gating)
 */
export async function checkMobilizationApproved(projectId: string): Promise<boolean> {
  const { data } = await supabase
    .from('project_mobilizations')
    .select('status')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .maybeSingle();

  return data?.status === 'approved';
}
