import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { startOfDay } from 'date-fns';

export type EntityType = 'visitor' | 'worker' | 'contractor' | 'employee' | 'vehicle';

export interface UnifiedAccessEntry {
  id: string;
  entity_type: EntityType;
  person_name: string;
  entry_time: string;
  exit_time: string | null;
  // Visitor-specific
  visitor_id?: string | null;
  mobile_number?: string | null;
  car_plate?: string | null;
  destination_name?: string | null;
  purpose?: string | null;
  nationality?: string | null;
  // Worker-specific
  worker_id?: string | null;
  project_id?: string | null;
  validation_status?: string | null;
  validation_errors?: string[] | null;
  // Common
  site_id?: string | null;
  guard_id?: string | null;
  notes?: string | null;
  created_at: string;
  // Joined data
  worker?: {
    id: string;
    full_name: string;
    full_name_ar?: string | null;
    photo_path?: string | null;
    national_id?: string;
    company?: { company_name: string } | null;
  } | null;
  project?: {
    project_name: string;
  } | null;
}

export interface UnifiedAccessStats {
  totalOnSite: number;
  visitorsOnSite: number;
  workersOnSite: number;
  todayEntries: number;
  pendingVisitorApprovals: number;
  pendingWorkerApprovals: number;
  pendingGatePassApprovals: number;
}

export interface UnifiedAccessFilters {
  search?: string;
  entityType?: EntityType | 'all';
  siteId?: string;
  dateFrom?: string;
  dateTo?: string;
  onlyActive?: boolean;
}

/**
 * Hook to get unified access statistics
 */
export function useUnifiedAccessStats() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const today = startOfDay(new Date()).toISOString();

  return useQuery({
    queryKey: ['unified-access-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      // Get visitors on site from gate_entry_logs
      const { count: visitorsOnSite } = await supabase
        .from('gate_entry_logs')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('entry_type', 'visitor')
        .gte('entry_time', today)
        .is('exit_time', null)
        .is('deleted_at', null);

      // Get workers on site from gate_entry_logs (new unified) + contractor_access_logs (legacy)
      const { count: workersOnSiteNew } = await supabase
        .from('gate_entry_logs')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('entry_type', 'worker')
        .gte('entry_time', today)
        .is('exit_time', null)
        .is('deleted_at', null);

      const { count: workersOnSiteLegacy } = await supabase
        .from('contractor_access_logs')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .not('worker_id', 'is', null)
        .gte('entry_time', today)
        .is('exit_time', null)
        .is('deleted_at', null);

      // Get today's entries
      const { count: todayVisitorEntries } = await supabase
        .from('gate_entry_logs')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('entry_time', today)
        .is('deleted_at', null);

      // Get pending visitor approvals
      const { count: pendingVisitorApprovals } = await supabase
        .from('visit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'pending_security')
        .is('deleted_at', null);

      // Get pending worker approvals
      const { count: pendingWorkerApprovals } = await supabase
        .from('contractor_workers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('approval_status', 'pending')
        .is('deleted_at', null);

      // Get pending gate pass approvals
      const { count: pendingGatePassApprovals } = await supabase
        .from('material_gate_passes')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['pending_pm_approval', 'pending_safety_approval'])
        .is('deleted_at', null);

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
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Hook to get unified access logs from both tables
 */
export function useUnifiedAccessLogs(filters: UnifiedAccessFilters = {}) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const queryClient = useQueryClient();

  // Real-time subscription
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

      // Fetch from gate_entry_logs (visitors + workers if present)
      if (!filters.entityType || filters.entityType === 'all' || filters.entityType === 'visitor' || filters.entityType === 'worker') {
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

      // Fetch from contractor_access_logs for workers (legacy entries)
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
          // Fetch worker details
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

          // Filter by search if applicable
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

      // Sort by entry time descending
      return results.sort((a, b) => new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime());
    },
    enabled: !!tenantId,
  });
}

/**
 * Hook to get on-site personnel count
 */
export function useOnSiteCount() {
  const { data: stats } = useUnifiedAccessStats();
  return {
    total: stats?.totalOnSite ?? 0,
    visitors: stats?.visitorsOnSite ?? 0,
    workers: stats?.workersOnSite ?? 0,
  };
}

/**
 * Hook to record unified entry (visitor or worker)
 */
export function useRecordUnifiedEntry() {
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: {
      entityType: EntityType;
      personName: string;
      // Visitor fields
      visitorId?: string;
      mobileNumber?: string;
      carPlate?: string;
      destinationName?: string;
      purpose?: string;
      nationality?: string;
      // Worker fields
      workerId?: string;
      projectId?: string;
      validationStatus?: string;
      validationErrors?: string[];
      // Common
      siteId?: string;
      notes?: string;
    }) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data, error } = await supabase
        .from('gate_entry_logs')
        .insert({
          tenant_id: tenantId,
          guard_id: user?.id,
          entry_type: params.entityType,
          person_name: params.personName,
          visitor_id: params.visitorId || null,
          mobile_number: params.mobileNumber || null,
          car_plate: params.carPlate || null,
          destination_name: params.destinationName || null,
          purpose: params.purpose || null,
          nationality: params.nationality || null,
          worker_id: params.workerId || null,
          project_id: params.projectId || null,
          validation_status: params.validationStatus || null,
          validation_errors: params.validationErrors || null,
          site_id: params.siteId || null,
          notes: params.notes || null,
          entry_time: new Date().toISOString(),
          access_type: 'entry',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-access-logs'] });
      queryClient.invalidateQueries({ queryKey: ['unified-access-stats'] });
      queryClient.invalidateQueries({ queryKey: ['gate-entries'] });
      toast({ title: t('security.accessControl.entryRecorded', 'Entry recorded successfully') });
    },
    onError: (error) => {
      toast({ title: t('security.accessControl.entryFailed', 'Failed to record entry'), variant: 'destructive' });
      console.error('Entry error:', error);
    },
  });
}

/**
 * Hook to record unified exit
 */
export function useRecordUnifiedExit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: { entryId: string; source?: 'gate_entry_logs' | 'contractor_access_logs' }) => {
      const table = params.source || 'gate_entry_logs';
      
      const { data, error } = await supabase
        .from(table)
        .update({ exit_time: new Date().toISOString() })
        .eq('id', params.entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-access-logs'] });
      queryClient.invalidateQueries({ queryKey: ['unified-access-stats'] });
      queryClient.invalidateQueries({ queryKey: ['gate-entries'] });
      queryClient.invalidateQueries({ queryKey: ['worker-access-logs'] });
      toast({ title: t('security.accessControl.exitRecorded', 'Exit recorded successfully') });
    },
    onError: (error) => {
      toast({ title: t('security.accessControl.exitFailed', 'Failed to record exit'), variant: 'destructive' });
      console.error('Exit error:', error);
    },
  });
}
