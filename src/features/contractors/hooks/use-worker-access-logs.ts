import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface WorkerAccessLog {
  id: string;
  worker_id: string | null;
  contractor_id: string | null;
  project_id: string | null;
  site_id: string | null;
  zone_id: string | null;
  guard_id: string | null;
  entry_time: string;
  exit_time: string | null;
  access_type: string;
  validation_status: string;
  validation_errors: string[] | null;
  notes: string | null;
  tenant_id: string;
  created_at: string;
  worker?: {
    id: string;
    full_name: string;
    full_name_ar: string | null;
    photo_path: string | null;
    national_id: string;
    company?: {
      company_name: string;
    };
  } | null;
  project?: {
    project_name: string;
  } | null;
}

interface UseWorkerAccessLogsFilters {
  workerId?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  onSiteOnly?: boolean;
}

export function useWorkerAccessLogs(filters: UseWorkerAccessLogsFilters = {}) {
  return useQuery({
    queryKey: ['worker-access-logs', filters],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant');

      let query = supabase
        .from('contractor_access_logs')
        .select(`
          id,
          worker_id,
          contractor_id,
          project_id,
          site_id,
          zone_id,
          guard_id,
          entry_time,
          exit_time,
          access_type,
          validation_status,
          validation_errors,
          notes,
          tenant_id,
          created_at
        `)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .not('worker_id', 'is', null) // Only get worker entries, not legacy contractor
        .order('entry_time', { ascending: false });

      if (filters.workerId) {
        query = query.eq('worker_id', filters.workerId);
      }

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      if (filters.dateFrom) {
        query = query.gte('entry_time', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('entry_time', filters.dateTo);
      }

      if (filters.onSiteOnly) {
        query = query.is('exit_time', null);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      // Fetch worker details separately if we have logs
      if (data && data.length > 0) {
        const workerIds = [...new Set(data.map(log => log.worker_id).filter(Boolean))] as string[];
        
        if (workerIds.length > 0) {
          const { data: workers } = await supabase
            .from('contractor_workers')
            .select(`
              id,
              full_name,
              full_name_ar,
              photo_path,
              national_id,
              company:contractor_companies(company_name)
            `)
            .in('id', workerIds);

          const workerMap = new Map(workers?.map(w => [w.id, w]) || []);

          return data.map(log => ({
            ...log,
            worker: log.worker_id ? workerMap.get(log.worker_id) : null,
          })) as WorkerAccessLog[];
        }
      }

      return (data || []) as WorkerAccessLog[];
    },
  });
}

export function useLogWorkerEntry() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workerId,
      projectId,
      siteId,
      zoneId,
      validationStatus,
      validationErrors,
      notes,
    }: {
      workerId: string;
      projectId?: string;
      siteId?: string;
      zoneId?: string;
      validationStatus: string;
      validationErrors?: string[];
      notes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('contractor_access_logs')
        .insert({
          worker_id: workerId,
          project_id: projectId || null,
          site_id: siteId || null,
          zone_id: zoneId || null,
          guard_id: userData.user.id,
          access_type: 'entry',
          validation_status: validationStatus,
          validation_errors: validationErrors || null,
          notes: notes || null,
          tenant_id: profile.tenant_id,
          entry_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-access-logs'] });
      toast.success(t('security.contractorAccess.entryLogged', 'Entry logged successfully'));
    },
    onError: (error) => {
      console.error('Error logging entry:', error);
      toast.error(t('security.contractorAccess.logError', 'Error logging entry'));
    },
  });
}

export function useRecordWorkerExit() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      logId,
      workerId,
      notes,
    }: {
      logId?: string;
      workerId?: string;
      notes?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant');

      // If logId provided, update that specific log
      if (logId) {
        const updateData: Record<string, unknown> = { exit_time: new Date().toISOString() };
        if (notes) updateData.notes = notes;
        
        const { error } = await supabase
          .from('contractor_access_logs')
          .update(updateData)
          .eq('id', logId);

        if (error) throw error;
        return { updated: true };
      }

      // Otherwise find the most recent entry without exit for this worker
      if (workerId) {
        const { data: existingLogs, error: fetchError } = await supabase
          .from('contractor_access_logs')
          .select('id')
          .eq('worker_id', workerId)
          .eq('tenant_id', profile.tenant_id)
          .is('exit_time', null)
          .order('entry_time', { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        if (existingLogs && existingLogs.length > 0) {
          const existingLog = existingLogs[0];
          const updateData: Record<string, unknown> = { exit_time: new Date().toISOString() };
          if (notes) updateData.notes = notes;
          
          const { error } = await supabase
            .from('contractor_access_logs')
            .update(updateData)
            .eq('id', existingLog.id);

          if (error) throw error;
          return { updated: true };
        }

        // No entry found, create an exit-only record
        const { error } = await supabase
          .from('contractor_access_logs')
          .insert({
            worker_id: workerId,
            guard_id: userData.user.id,
            access_type: 'exit',
            validation_status: 'valid',
            exit_time: new Date().toISOString(),
            entry_time: new Date().toISOString(), // Required field
            tenant_id: profile.tenant_id,
            notes: notes || null,
          });

        if (error) throw error;
        return { created: true };
      }

      throw new Error('Either logId or workerId is required');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-access-logs'] });
      toast.success(t('security.contractorAccess.exitRecorded', 'Exit recorded successfully'));
    },
    onError: (error) => {
      console.error('Error recording exit:', error);
      toast.error(t('security.contractorAccess.logError', 'Error recording exit'));
    },
  });
}

export function useWorkersOnSiteCount() {
  return useQuery({
    queryKey: ['workers-on-site-count'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return 0;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile?.tenant_id) return 0;

      // Get today's start
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('contractor_access_logs')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id)
        .not('worker_id', 'is', null)
        .gte('entry_time', today.toISOString())
        .is('exit_time', null)
        .is('deleted_at', null);

      if (error) {
        console.error('Error fetching workers on site:', error);
        return 0;
      }

      return count || 0;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
