import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { startOfDay } from 'date-fns';
import type { EntityType, UnifiedAccessEntry, UnifiedAccessStats, UnifiedAccessFilters } from './types';

export function useUnifiedAccessStats() {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;
    const today = startOfDay(new Date()).toISOString();

    return useQuery({
        queryKey: ['unified-access-stats', tenantId],
        queryFn: async () => {
            if (!tenantId) return null;

            const [
                { count: visitorsOnSite },
                { count: workersOnSiteNew },
                { count: workersOnSiteLegacy },
                { count: todayVisitorEntries },
                { count: pendingVisitorApprovals },
                { count: pendingWorkerApprovals },
                { count: pendingGatePassApprovals }
            ] = await Promise.all([
                supabase
                    .from('gate_entry_logs')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId)
                    .eq('entry_type', 'visitor')
                    .gte('entry_time', today)
                    .is('exit_time', null)
                    .is('deleted_at', null),

                supabase
                    .from('gate_entry_logs')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId)
                    .eq('entry_type', 'worker')
                    .gte('entry_time', today)
                    .is('exit_time', null)
                    .is('deleted_at', null),

                supabase
                    .from('contractor_access_logs')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId)
                    .not('worker_id', 'is', null)
                    .gte('entry_time', today)
                    .is('exit_time', null)
                    .is('deleted_at', null),

                supabase
                    .from('gate_entry_logs')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId)
                    .gte('entry_time', today)
                    .is('deleted_at', null),

                supabase
                    .from('visit_requests')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId)
                    .eq('status', 'pending_security')
                    .is('deleted_at', null),

                supabase
                    .from('contractor_workers')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId)
                    .eq('approval_status', 'pending')
                    .is('deleted_at', null),

                supabase
                    .from('material_gate_passes')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId)
                    .in('status', ['pending_pm_approval', 'pending_safety_approval'])
                    .is('deleted_at', null)
            ]);

            const workersOnSite = (workersOnSiteNew || 0) + (workersOnSiteLegacy || 0);

            return {
                totalOnSite: (visitorsOnSite || 0) + workersOnSite,
                visitorsOnSite: visitorsOnSite || 0,
                workersOnSite,
                todayEntries: todayVisitorEntries || 0,
                pendingVisitorApprovals: pendingVisitorApprovals || 0,
                pendingWorkerApprovals: pendingWorkerApprovals || 0,
                pendingGatePassApprovals: pendingGatePassApprovals || 0,
            } as UnifiedAccessStats;
        },
        enabled: !!tenantId,
        refetchInterval: 30000,
    });
}

export function useUnifiedAccessLogs(filters: UnifiedAccessFilters = {}) {
    const { profile } = useAuth();
    const tenantId = profile?.tenant_id;
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!tenantId) return;

        const channel = supabase
            .channel('unified-access-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_entry_logs', filter: `tenant_id=eq.${tenantId}` }, () => {
                queryClient.invalidateQueries({ queryKey: ['unified-access-logs'] });
                queryClient.invalidateQueries({ queryKey: ['unified-access-stats'] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'contractor_access_logs', filter: `tenant_id=eq.${tenantId}` }, () => {
                queryClient.invalidateQueries({ queryKey: ['unified-access-logs'] });
                queryClient.invalidateQueries({ queryKey: ['unified-access-stats'] });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [tenantId, queryClient]);

    return useQuery({
        queryKey: ['unified-access-logs', tenantId, filters],
        queryFn: async () => {
            if (!tenantId) return [];

            const results: UnifiedAccessEntry[] = [];

            if (!filters.entityType || filters.entityType === 'all' || filters.entityType === 'visitor' || filters.entityType === 'worker' || filters.entityType === 'vehicle') {
                let gateQuery = supabase
                    .from('gate_entry_logs')
                    .select(`
            id, person_name, entry_type, entry_time, exit_time, visitor_id, 
            mobile_number, car_plate, destination_name, purpose, nationality,
            worker_id, project_id, validation_status, validation_errors,
            site_id, guard_id, notes, created_at
          `)
                    .eq('tenant_id', tenantId)
                    .is('deleted_at', null)
                    .order('entry_time', { ascending: false });

                if (filters.search) {
                    gateQuery = gateQuery.or(`person_name.ilike.%${filters.search}%,car_plate.ilike.%${filters.search}%,mobile_number.ilike.%${filters.search}%`);
                }

                if (filters.entityType && filters.entityType !== 'all') {
                    gateQuery = gateQuery.eq('entry_type', filters.entityType);
                }

                if (filters.siteId) {
                    gateQuery = gateQuery.eq('site_id', filters.siteId);
                }

                if (filters.dateFrom) {
                    gateQuery = gateQuery.gte('entry_time', filters.dateFrom);
                }

                if (filters.dateTo) {
                    gateQuery = gateQuery.lte('entry_time', filters.dateTo);
                }

                if (filters.onlyActive) {
                    gateQuery = gateQuery.is('exit_time', null);
                }

                const { data: gateData, error: gateError } = await gateQuery.limit(100);
                if (!gateError && gateData) {
                    results.push(...gateData.map(entry => ({
                        ...entry,
                        entity_type: (entry.entry_type || 'visitor') as EntityType,
                        validation_errors: Array.isArray(entry.validation_errors)
                            ? entry.validation_errors as string[]
                            : entry.validation_errors
                                ? [String(entry.validation_errors)]
                                : null,
                    })));
                }
            }

            if (!filters.entityType || filters.entityType === 'all' || filters.entityType === 'worker') {
                let workerQuery = supabase
                    .from('contractor_access_logs')
                    .select(`
            id, worker_id, project_id, site_id, guard_id, entry_time, exit_time,
            access_type, validation_status, validation_errors, notes, created_at
          `)
                    .eq('tenant_id', tenantId)
                    .not('worker_id', 'is', null)
                    .is('deleted_at', null)
                    .order('entry_time', { ascending: false });

                if (filters.dateFrom) {
                    workerQuery = workerQuery.gte('entry_time', filters.dateFrom);
                }

                if (filters.dateTo) {
                    workerQuery = workerQuery.lte('entry_time', filters.dateTo);
                }

                if (filters.onlyActive) {
                    workerQuery = workerQuery.is('exit_time', null);
                }

                const { data: workerData, error: workerError } = await workerQuery.limit(50);

                if (!workerError && workerData && workerData.length > 0) {
                    const workerIds = [...new Set(workerData.map(log => log.worker_id).filter(Boolean))] as string[];

                    const { data: workers } = await supabase
                        .from('contractor_workers')
                        .select(`id, full_name, full_name_ar, photo_path, national_id, company:contractor_companies(company_name)`)
                        .in('id', workerIds);

                    const workerMap = new Map(workers?.map(w => [w.id, w]) || []);

                    const workerEntries: UnifiedAccessEntry[] = workerData.map(log => {
                        const worker = log.worker_id ? workerMap.get(log.worker_id) : null;
                        return {
                            id: log.id,
                            entity_type: 'worker' as EntityType,
                            person_name: worker?.full_name || 'Unknown Worker',
                            entry_time: log.entry_time,
                            exit_time: log.exit_time,
                            worker_id: log.worker_id,
                            project_id: log.project_id,
                            site_id: log.site_id,
                            guard_id: log.guard_id,
                            validation_status: log.validation_status,
                            validation_errors: log.validation_errors as string[] | null,
                            notes: log.notes,
                            created_at: log.created_at,
                            worker: worker ? {
                                id: worker.id,
                                full_name: worker.full_name,
                                full_name_ar: worker.full_name_ar,
                                photo_path: worker.photo_path,
                                national_id: worker.national_id,
                                company: worker.company as { company_name: string } | null,
                            } : null,
                        };
                    });

                    if (filters.search) {
                        const searchLower = filters.search.toLowerCase();
                        results.push(...workerEntries.filter(e =>
                            e.person_name.toLowerCase().includes(searchLower) ||
                            e.worker?.national_id?.toLowerCase().includes(searchLower)
                        ));
                    } else {
                        results.push(...workerEntries);
                    }
                }
            }

            return results.sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime());
        },
        enabled: !!tenantId,
    });
}

export function useOnSiteCount() {
    const { data: stats } = useUnifiedAccessStats();
    return {
        total: stats?.totalOnSite ?? 0,
        visitors: stats?.visitorsOnSite ?? 0,
        workers: stats?.workersOnSite ?? 0,
    };
}
