import { supabase } from '@/integrations/supabase/client';
import type { SecurityAuditLog, AuditLogInput } from '@/features/security';
import type { Database } from '@/integrations/supabase/types';

interface SecurityAuditLogFilters {
    action_category?: string;
    action?: string;
    entity_type?: string;
    result?: string;
    actor_id?: string;
    site_id?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    limit?: number;
}

export const getSecurityAuditLogs = async (tenantId: string, filters?: SecurityAuditLogFilters) => {
    let query = supabase
        .from('security_audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);

    if (filters?.action_category) {
        query = query.eq('action_category', filters.action_category);
    }
    if (filters?.action) {
        query = query.eq('action', filters.action);
    }
    if (filters?.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
    }
    if (filters?.result) {
        query = query.eq('result', filters.result);
    }
    if (filters?.actor_id) {
        query = query.eq('actor_id', filters.actor_id);
    }
    if (filters?.site_id) {
        query = query.eq('site_id', filters.site_id);
    }
    if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
    }
    if (filters?.search) {
        query = query.or(`entity_identifier.ilike.%${filters.search}%,actor_name.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as SecurityAuditLog[];
};

export const logSecurityAudit = async (tenantId: string, userId: string | undefined, userName: string | undefined, log: AuditLogInput) => {
    const insertData: Database['public']['Tables']['security_audit_logs']['Insert'] = {
        ...log,
        tenant_id: tenantId,
        actor_id: userId,
        actor_name: userName,
        user_agent: navigator.userAgent,
        metadata: (log.metadata || {}) as any,
    };

    const { error } = await supabase
        .from('security_audit_logs')
        .insert(insertData);

    if (error) throw error;
};

