import { supabase } from '../supabaseClient';
import type { GatePassApprover, EmployeeApprover } from '@/features/contractors/hooks/use-gate-pass-approvers';

interface ApproverRow {
    id: string;
    tenant_id?: string;
    name: string;
    name_ar?: string;
    code: string;
    description?: string;
    is_active?: boolean;
    sort_order?: number;
    user_id?: string;
    approver_scope?: "external" | "internal" | "both";
    created_at?: string;
    updated_at?: string;
    user?: unknown;
    [key: string]: unknown;
}

export const getGatePassApprovers = async (scope?: "external" | "internal"): Promise<Pick<GatePassApprover, "id" | "name" | "name_ar" | "code" | "sort_order" | "user_id" | "approver_scope" | "user">[]> => {
    let query = supabase
        .from("gate_pass_approvers")
        .select(`
      id, name, name_ar, code, sort_order, user_id, approver_scope,
      user:profiles!gate_pass_approvers_user_id_fkey(id, full_name, job_title, avatar_url)
    `)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });

    if (scope) {
        query = query.or(`approver_scope.eq.${scope},approver_scope.eq.both`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((item: unknown) => {
        const row = item as ApproverRow;
        return {
            ...row,
            user: row.user || null,
        };
    }) as Pick<GatePassApprover, "id" | "name" | "name_ar" | "code" | "sort_order" | "user_id" | "approver_scope" | "user">[];
};

export const getEmployeeApprovers = async (tenantId: string): Promise<EmployeeApprover[]> => {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, job_title")
        .eq("tenant_id", tenantId)
        .eq("is_deleted", false)
        .eq("is_active", true)
        .eq("user_type", "employee")
        .not("full_name", "is", null)
        .order("full_name", { ascending: true });

    if (error) throw error;
    return (data || []) as EmployeeApprover[];
};

export const getAllGatePassApprovers = async (): Promise<GatePassApprover[]> => {
    const { data, error } = await supabase
        .from("gate_pass_approvers")
        .select(`
      id, tenant_id, name, name_ar, code, description, is_active, sort_order, 
      user_id, approver_scope, created_at, updated_at,
      user:profiles!gate_pass_approvers_user_id_fkey(id, full_name, job_title, avatar_url)
    `)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });

    if (error) throw error;
    return (data || []).map((item: unknown) => {
        const row = item as ApproverRow;
        return {
            ...row,
            approver_scope: row.approver_scope || "both",
            user: row.user || null,
        } as GatePassApprover;
    });
};

export const createGatePassApprover = async (
    approver: {
        name: string;
        name_ar?: string;
        code: string;
        description?: string;
        is_active?: boolean;
        sort_order?: number;
        user_id?: string;
        approver_scope?: "external" | "internal" | "both";
    },
    userId: string
) => {
    const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", userId)
        .single();

    if (!profile?.tenant_id) throw new Error("Tenant not found");

    const { data, error } = await supabase
        .from("gate_pass_approvers")
        .insert({
            ...approver,
            tenant_id: profile.tenant_id,
            approver_scope: approver.approver_scope || "both",
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateGatePassApprover = async (
    id: string,
    updates: Partial<GatePassApprover>
) => {
    const { user, ...updateData } = updates as Record<string, unknown>;

    const { data, error } = await supabase
        .from("gate_pass_approvers")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteGatePassApprover = async (id: string) => {
    const { error } = await supabase
        .from("gate_pass_approvers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

    if (error) throw error;
};
