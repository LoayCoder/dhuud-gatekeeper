import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface GuardAttendanceLog {
  id: string;
  tenant_id: string;
  guard_id: string;
  roster_id: string | null;
  zone_id: string | null;
  check_in_at: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_in_accuracy: number | null;
  check_in_method: string;
  check_out_at: string | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_out_accuracy: number | null;
  check_out_method: string;
  expected_start_time: string | null;
  expected_end_time: string | null;
  gps_validated: boolean;
  late_minutes: number;
  early_departure_minutes: number;
  overtime_minutes: number;
  total_hours_worked: number | null;
  status: string;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  guard?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  zone?: {
    id: string;
    zone_name: string;
  };
}

interface AttendanceFilters {
  date?: string;
  guardId?: string;
  status?: string;
  zoneId?: string;
}

export function useGuardAttendance(filters?: AttendanceFilters) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['guard-attendance', tenantId, filters],
    queryFn: async () => {
      let query = supabase
        .from('guard_attendance_logs')
        .select(`
          *,
          guard:profiles!guard_id(id, full_name, avatar_url),
          zone:security_zones!zone_id(id, zone_name)
        `)
        .is('deleted_at', null)
        .order('check_in_at', { ascending: false });

      if (filters?.date) {
        const startOfDay = new Date(filters.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filters.date);
        endOfDay.setHours(23, 59, 59, 999);
        
        query = query
          .gte('check_in_at', startOfDay.toISOString())
          .lte('check_in_at', endOfDay.toISOString());
      }

      if (filters?.guardId) {
        query = query.eq('guard_id', filters.guardId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.zoneId) {
        query = query.eq('zone_id', filters.zoneId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as GuardAttendanceLog[];
    },
    enabled: !!tenantId,
  });
}

export function useMyActiveAttendance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-active-attendance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('guard_attendance_logs')
        .select('*')
        .eq('guard_id', user.id)
        .eq('status', 'checked_in')
        .is('check_out_at', null)
        .order('check_in_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as GuardAttendanceLog | null;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (params: {
      rosterId?: string;
      zoneId?: string;
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      method?: 'gps' | 'nfc' | 'qr' | 'manual';
      notes?: string;
    }) => {
      if (!user?.id || !tenantId) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('process-guard-attendance', {
        body: {
          action: 'check_in',
          guardId: user.id,
          tenantId,
          ...params,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['guard-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-active-attendance'] });
      
      toast({
        title: 'Checked In',
        description: data.lateMinutes > 0 
          ? `You are ${data.lateMinutes} minutes late.`
          : 'You have successfully checked in.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Check-in Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (params: {
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      method?: 'gps' | 'nfc' | 'qr' | 'manual';
      notes?: string;
    }) => {
      if (!user?.id || !tenantId) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('process-guard-attendance', {
        body: {
          action: 'check_out',
          guardId: user.id,
          tenantId,
          ...params,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['guard-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-active-attendance'] });
      
      toast({
        title: 'Checked Out',
        description: `Worked ${data.hoursWorked} hours.${data.overtimeMinutes > 0 ? ` (${data.overtimeMinutes} min overtime)` : ''}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Check-out Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAttendanceStats(dateRange?: { from: Date; to: Date }) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['attendance-stats', tenantId, dateRange],
    queryFn: async () => {
      const from = dateRange?.from || new Date(new Date().setDate(new Date().getDate() - 7));
      const to = dateRange?.to || new Date();

      const { data, error } = await supabase
        .from('guard_attendance_logs')
        .select('status, late_minutes, overtime_minutes, total_hours_worked, gps_validated')
        .is('deleted_at', null)
        .gte('check_in_at', from.toISOString())
        .lte('check_in_at', to.toISOString());

      if (error) throw error;

      const stats = {
        totalRecords: data.length,
        checkedIn: data.filter(r => r.status === 'checked_in').length,
        checkedOut: data.filter(r => r.status === 'checked_out').length,
        noShows: data.filter(r => r.status === 'no_show').length,
        lateArrivals: data.filter(r => r.late_minutes > 0).length,
        avgLateMinutes: data.filter(r => r.late_minutes > 0).reduce((sum, r) => sum + r.late_minutes, 0) / Math.max(data.filter(r => r.late_minutes > 0).length, 1),
        totalOvertimeMinutes: data.reduce((sum, r) => sum + (r.overtime_minutes || 0), 0),
        totalHoursWorked: data.reduce((sum, r) => sum + (r.total_hours_worked || 0), 0),
        gpsValidatedRate: (data.filter(r => r.gps_validated).length / Math.max(data.length, 1)) * 100,
      };

      return stats;
    },
    enabled: !!tenantId,
  });
}

export function useApproveAttendance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ attendanceId, approved, reason }: { attendanceId: string; approved: boolean; reason?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('guard_attendance_logs')
        .update({
          status: approved ? 'approved' : 'rejected',
          approved_by: approved ? user.id : null,
          approved_at: approved ? new Date().toISOString() : null,
          rejection_reason: !approved ? reason : null,
        })
        .eq('id', attendanceId);

      if (error) throw error;
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ['guard-attendance'] });
      toast({
        title: approved ? 'Approved' : 'Rejected',
        description: `Attendance record has been ${approved ? 'approved' : 'rejected'}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
