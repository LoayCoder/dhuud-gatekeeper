import { supabase } from '../supabaseClient';
import type { UserWithRoles, UseUsersPaginatedFilters } from '@/features/users';
import { Json } from '@/integrations/supabase/types';

function parseRoleAssignments(json: Json | null): Array<{
    role_id: string;
    role_code: string;
    role_name: string;
    category: string;
}> {
    if (!json || !Array.isArray(json)) return [];
    return json.map((item: unknown) => {
        const obj = item as Record<string, unknown>;
        return {
            role_id: String(obj.role_id || ''),
            role_code: String(obj.role_code || ''),
            role_name: String(obj.role_name || ''),
            category: String(obj.category || 'general'),
        };
    });
}

export const getUsersPaginated = async (tenantId: string, filters: UseUsersPaginatedFilters, offset: number, pageSize: number): Promise<{ users: UserWithRoles[]; totalCount: number }> => {
    const { data, error } = await supabase.rpc('get_users_with_roles_paginated', {
        p_tenant_id: tenantId,
        p_user_type: filters.userType || null,
        p_is_active: filters.isActive ?? null,
        p_branch_id: filters.branchId || null,
        p_division_id: filters.divisionId || null,
        p_role_code: filters.roleCode || null,
        p_search_term: filters.searchTerm || null,
        p_offset: offset,
        p_limit: pageSize,
    });

    if (error) throw error;

    const totalCount = data && data.length > 0 ? Number(data[0].total_count) : 0;

    const users: UserWithRoles[] = (data || []).map((row) => ({
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        phone_number: row.phone_number,
        user_type: row.user_type,
        has_login: row.has_login,
        is_active: row.is_active,
        employee_id: row.employee_id,
        job_title: row.job_title,
        assigned_branch_id: row.assigned_branch_id,
        branch_name: row.branch_name,
        assigned_division_id: row.assigned_division_id,
        division_name: row.division_name,
        assigned_department_id: row.assigned_department_id,
        department_name: row.department_name,
        assigned_section_id: row.assigned_section_id,
        section_name: row.section_name,
        contractor_company_name: row.contractor_company_name,
        contract_start: row.contract_start,
        contract_end: row.contract_end,
        has_full_branch_access: row.has_full_branch_access,
        membership_id: row.membership_id,
        membership_start: row.membership_start,
        membership_end: row.membership_end,
        role_assignments: parseRoleAssignments(row.role_assignments),
    }));

    return { users, totalCount };
};

