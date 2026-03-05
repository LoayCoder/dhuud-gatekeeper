import { supabase } from '@/integrations/supabase/client';

export interface PTWProjectFilters {
    search?: string;
    status?: string;
    siteId?: string;
    contractorId?: string;
}

export async function getPTWProjects(tenantId: string, filters: PTWProjectFilters, branchIds: string[], isAllBranchesMode: boolean) {
    let query = supabase
        .from("ptw_projects")
        .select(`
      id, tenant_id, reference_id, name, name_ar, description,
      site_id, contractor_company_id, project_manager_id, linked_contractor_project_id,
      is_internal_work, start_date, end_date, status, mobilization_percentage,
      created_by, created_at, updated_at,
      site:sites(name, branch_id),
      contractor_company:contractor_companies(company_name),
      project_manager:profiles!ptw_projects_project_manager_id_fkey(full_name),
      linked_contractor_project:contractor_projects(project_code, project_name)
    `)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,reference_id.ilike.%${filters.search}%`);
    }
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.siteId) query = query.eq("site_id", filters.siteId);
    if (filters.contractorId) query = query.eq("contractor_company_id", filters.contractorId);

    const { data, error } = await query;
    if (error) throw error;

    if (!isAllBranchesMode && branchIds && branchIds.length > 0) {
        return (data as { site?: { branch_id?: string } }[]).filter(project => {
            const siteBranchId = project.site?.branch_id;
            return siteBranchId && branchIds.includes(siteBranchId);
        });
    }

    return data;
}

export async function getPTWProjectClearances(projectId: string) {
    const { data, error } = await supabase
        .from("ptw_clearance_checks")
        .select(`
      id, project_id, requirement_name, requirement_name_ar, category,
      is_mandatory, status, approved_by, approved_at, comments, sort_order,
      approver:profiles!ptw_clearance_checks_approved_by_fkey(full_name)
    `)
        .eq("project_id", projectId)
        .is("deleted_at", null)
        .order("sort_order");

    if (error) throw error;
    return data;
}

export async function createPTWProject(data: {
    name?: string;
    name_ar?: string;
    description?: string;
    site_id?: string;
    contractor_company_id?: string;
    project_manager_id?: string;
    linked_contractor_project_id?: string;
    is_internal_work?: boolean;
    start_date?: string;
    end_date?: string;
}, tenantId: string, userId: string) {
    const insertData = {
        name: data.name!,
        name_ar: data.name_ar,
        description: data.description,
        site_id: data.site_id,
        contractor_company_id: data.contractor_company_id,
        project_manager_id: data.project_manager_id,
        linked_contractor_project_id: data.linked_contractor_project_id,
        is_internal_work: data.is_internal_work ?? false,
        start_date: data.start_date!,
        end_date: data.end_date!,
        tenant_id: tenantId,
        created_by: userId,
    };

    const { data: result, error } = await supabase
        .from("ptw_projects")
        .insert(insertData as never)
        .select()
        .single();

    if (error) throw error;
    return result;
}

export async function approveClearanceCheck(checkId: string, userId: string, comments?: string) {
    const { data, error } = await supabase
        .from("ptw_clearance_checks")
        .update({
            status: "approved",
            approved_by: userId,
            approved_at: new Date().toISOString(),
            comments,
        })
        .eq("id", checkId)
        .select("project_id")
        .single();

    if (error) throw error;
    return data;
}

export async function rejectClearanceCheck(checkId: string, userId: string, comments: string) {
    const { data, error } = await supabase
        .from("ptw_clearance_checks")
        .update({
            status: "rejected",
            approved_by: userId,
            approved_at: new Date().toISOString(),
            comments,
        })
        .eq("id", checkId)
        .select("project_id")
        .single();
    if (error) throw error;
    return data;
}

export async function getMobilizationProject(projectId: string, tenantId: string) {
    const { data, error } = await supabase
        .from("ptw_projects")
        .select(`
      status, 
      mobilization_percentage,
      contractor_company_id,
      site_id,
      contractor_company:contractor_companies(id, company_name, status),
      site:sites(id, name),
      project_manager:profiles!ptw_projects_project_manager_id_fkey(full_name)
    `)
        .eq("id", projectId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

    if (error) {
        console.warn("Project not found for mobilization check:", error);
        return null;
    }
    return data;
}

export async function getProjectContextWorkers(projectId: string, tenantId: string) {
    const { data: project, error: projectError } = await supabase
        .from("ptw_projects")
        .select("contractor_company_id, linked_contractor_project_id")
        .eq("id", projectId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single();

    if (projectError || !project?.contractor_company_id) {
        return { project: null, workers: [], assignments: null };
    }

    const { data: workers, error: workersError } = await supabase
        .from("contractor_workers")
        .select(`
      id, full_name, full_name_ar, national_id, mobile_number, approval_status
    `)
        .eq("tenant_id", tenantId)
        .eq("company_id", project.contractor_company_id)
        .eq("approval_status", "approved")
        .is("deleted_at", null)
        .order("full_name");

    if (workersError) throw workersError;

    let assignments = null;
    if (project.linked_contractor_project_id) {
        const { data: assignmentsData, error: assignmentsError } = await supabase
            .from("project_worker_assignments")
            .select("worker_id")
            .eq("project_id", project.linked_contractor_project_id)
            .eq("is_active", true)
            .is("deleted_at", null);

        if (!assignmentsError && assignmentsData) {
            assignments = assignmentsData;
        }
    }

    return { project, workers, assignments };
}

export async function getPTWAuditLogs(permitId: string) {
    const { data, error } = await supabase
        .from('ptw_audit_logs')
        .select(`
      id, tenant_id, permit_id, project_id, actor_id, action,
      old_value, new_value, ip_address, created_at,
      actor:profiles!ptw_audit_logs_actor_id_fkey (
        id, full_name, avatar_url
      )
    `)
        .eq('permit_id', permitId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function getPTWProjectAuditLogs(projectId: string) {
    const { data, error } = await supabase
        .from('ptw_audit_logs')
        .select(`
      id, tenant_id, permit_id, project_id, actor_id, action,
      old_value, new_value, ip_address, created_at,
      actor:profiles!ptw_audit_logs_actor_id_fkey (
        id, full_name, avatar_url
      )
    `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function getPTWRecentAuditActivity(limit: number) {
    const { data, error } = await supabase
        .from('ptw_audit_logs')
        .select(`
      id, tenant_id, permit_id, project_id, actor_id, action,
      old_value, new_value, ip_address, created_at,
      actor:profiles!ptw_audit_logs_actor_id_fkey (
        id, full_name, avatar_url
      )
    `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

export async function checkSimopsConflicts(params: {
    p_type_id: string;
    p_site_id: string;
    p_gps_lat: number | null;
    p_gps_lng: number | null;
    p_start_time: string;
    p_end_time: string;
    p_exclude_permit_id: string | null;
}) {
    const { data, error } = await supabase.rpc('check_simops_conflicts', params);

    if (error) throw error;
    return data || [];
}
