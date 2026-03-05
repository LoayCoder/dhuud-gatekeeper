import { supabase } from '../supabaseClient';

export interface CreateManhourInput {
    period_date: string;
    period_type: 'daily' | 'weekly' | 'monthly';
    employee_hours: number;
    contractor_hours: number;
    employee_count?: number;
    contractor_count?: number;
    hours_per_day?: number;
    working_days?: number;
    calculation_mode?: 'manual' | 'auto';
    branch_id?: string | null;
    site_id?: string | null;
    department_id?: string | null;
    notes?: string | null;
}

export const getManhours = async (startDate?: string, endDate?: string) => {
    let query = supabase
        .from('manhours')
        .select(`
      id,
      tenant_id,
      period_date,
      period_type,
      employee_hours,
      contractor_hours,
      employee_count,
      contractor_count,
      hours_per_day,
      working_days,
      calculation_mode,
      branch_id,
      site_id,
      department_id,
      notes,
      recorded_by,
      created_at,
      updated_at,
      branches(name),
      sites(name),
      departments(name)
    `)
        .is('deleted_at', null)
        .order('period_date', { ascending: false });

    if (startDate) {
        query = query.gte('period_date', startDate);
    }
    if (endDate) {
        query = query.lte('period_date', endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
};

export const createManhour = async (input: CreateManhourInput, userId: string, tenantId: string) => {
    const { data, error } = await supabase
        .from('manhours')
        .insert({
            ...input,
            tenant_id: tenantId,
            recorded_by: userId,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateManhour = async (id: string, input: Partial<CreateManhourInput>) => {
    const { data, error } = await supabase
        .from('manhours')
        .update(input)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteManhour = async (id: string) => {
    const { error } = await supabase
        .from('manhours')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

    if (error) throw error;
};

export const getManhoursSummary = async (startDate: string, endDate: string, branchId?: string, siteId?: string) => {
    const { data, error } = await supabase.rpc('get_manhours_summary', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_branch_id: branchId || null,
        p_site_id: siteId || null,
        p_department_id: null,
    });

    if (error) throw error;
    return data?.[0] || { total_employee_hours: 0, total_contractor_hours: 0, total_hours: 0, record_count: 0 };
};
