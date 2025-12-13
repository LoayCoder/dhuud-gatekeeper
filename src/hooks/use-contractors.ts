import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const getProfileId = (profile: any): string | undefined => profile?.id;
export interface Contractor {
  id: string;
  contractor_code: string;
  full_name: string;
  company_name: string | null;
  mobile_number: string | null;
  email: string | null;
  national_id: string | null;
  nationality: string | null;
  preferred_language: string | null;
  permit_number: string | null;
  permit_expiry_date: string | null;
  safety_induction_date: string | null;
  safety_induction_expiry: string | null;
  medical_exam_date: string | null;
  medical_exam_expiry: string | null;
  photo_path: string | null;
  is_banned: boolean | null;
  ban_reason: string | null;
  ban_expires_at: string | null;
  banned_at: string | null;
  banned_by: string | null;
  allowed_sites: string[] | null;
  allowed_zones: string[] | null;
  qr_code_data: string | null;
  tenant_id: string;
  created_at: string | null;
}

export interface ContractorAccessLog {
  id: string;
  contractor_id: string;
  site_id: string | null;
  zone_id: string | null;
  guard_id: string | null;
  entry_time: string;
  exit_time: string | null;
  access_type: string;
  validation_status: string;
  validation_errors: any;
  alert_sent: boolean | null;
  alert_language: string | null;
  notes: string | null;
  tenant_id: string;
  contractor?: Contractor;
}

export interface ContractorFilters {
  search?: string;
  status?: 'all' | 'active' | 'banned' | 'expired';
  companyName?: string;
}

export function useContractors(filters: ContractorFilters = {}) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['contractors', filters, profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      let query = supabase
        .from('contractors')
        .select('id, contractor_code, full_name, company_name, mobile_number, nationality, preferred_language, permit_expiry_date, safety_induction_expiry, medical_exam_expiry, is_banned, ban_reason, ban_expires_at, photo_path, allowed_sites, allowed_zones, created_at, tenant_id')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,contractor_code.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`);
      }

      if (filters.status === 'banned') {
        query = query.eq('is_banned', true);
      } else if (filters.status === 'expired') {
        const today = new Date().toISOString().split('T')[0];
        query = query.or(`permit_expiry_date.lt.${today},safety_induction_expiry.lt.${today},medical_exam_expiry.lt.${today}`);
      } else if (filters.status === 'active') {
        query = query.or('is_banned.is.null,is_banned.eq.false');
      }

      if (filters.companyName) {
        query = query.ilike('company_name', `%${filters.companyName}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Contractor[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useContractor(id: string | null) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['contractor', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data as Contractor;
    },
    enabled: !!id && !!profile?.tenant_id,
  });
}

export function useCreateContractor() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<Contractor>) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      const contractorCode = `CON-${Date.now().toString(36).toUpperCase()}`;
      const qrCodeData = `CONTRACTOR:${contractorCode}`;
      const profileId = getProfileId(profile);

      const { data: result, error } = await supabase
        .from('contractors')
        .insert({
          full_name: data.full_name || '',
          company_name: data.company_name,
          mobile_number: data.mobile_number,
          email: data.email,
          national_id: data.national_id,
          nationality: data.nationality,
          preferred_language: data.preferred_language,
          permit_number: data.permit_number,
          permit_expiry_date: data.permit_expiry_date,
          safety_induction_date: data.safety_induction_date,
          safety_induction_expiry: data.safety_induction_expiry,
          medical_exam_date: data.medical_exam_date,
          medical_exam_expiry: data.medical_exam_expiry,
          tenant_id: profile.tenant_id,
          contractor_code: contractorCode,
          qr_code_data: qrCodeData,
          created_by: profileId,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Contractor created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create contractor: ${error.message}`);
    },
  });
}

export function useUpdateContractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contractor> }) => {
      const { data: result, error } = await supabase
        .from('contractors')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Contractor updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update contractor: ${error.message}`);
    },
  });
}

export function useBanContractor() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, reason, expiresAt }: { id: string; reason: string; expiresAt?: string }) => {
      const profileId = getProfileId(profile);
      const { error } = await supabase
        .from('contractors')
        .update({
          is_banned: true,
          ban_reason: reason,
          ban_expires_at: expiresAt || null,
          banned_at: new Date().toISOString(),
          banned_by: profileId,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Contractor banned successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to ban contractor: ${error.message}`);
    },
  });
}

export function useUnbanContractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contractors')
        .update({
          is_banned: false,
          ban_reason: null,
          ban_expires_at: null,
          banned_at: null,
          banned_by: null,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Contractor unbanned successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to unban contractor: ${error.message}`);
    },
  });
}

export function useValidateContractor() {
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ contractorCode, siteId, zoneId }: { contractorCode: string; siteId?: string; zoneId?: string }) => {
      const { data, error } = await supabase.functions.invoke('validate-contractor', {
        body: {
          contractor_code: contractorCode,
          site_id: siteId,
          zone_id: zoneId,
          tenant_id: profile?.tenant_id,
        },
      });

      if (error) throw error;
      return data;
    },
  });
}

export function useLogContractorAccess() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      contractorId: string;
      siteId?: string;
      zoneId?: string;
      accessType: 'entry' | 'exit';
      validationStatus: string;
      validationErrors?: any;
      notes?: string;
    }) => {
      if (!profile?.tenant_id) throw new Error('No tenant');
      const profileId = getProfileId(profile);

      const { error } = await supabase.from('contractor_access_logs').insert({
        contractor_id: data.contractorId,
        site_id: data.siteId,
        zone_id: data.zoneId,
        guard_id: profileId,
        entry_time: new Date().toISOString(),
        access_type: data.accessType,
        validation_status: data.validationStatus,
        validation_errors: data.validationErrors,
        notes: data.notes,
        tenant_id: profile.tenant_id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-access-logs'] });
      toast.success('Access logged successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to log access: ${error.message}`);
    },
  });
}

export function useContractorAccessLogs(filters: { contractorId?: string; siteId?: string; dateFrom?: string; dateTo?: string } = {}) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['contractor-access-logs', filters, profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      let query = supabase
        .from('contractor_access_logs')
        .select(`
          id, contractor_id, site_id, zone_id, guard_id, entry_time, exit_time, 
          access_type, validation_status, validation_errors, alert_sent, notes, tenant_id,
          contractor:contractors(id, full_name, company_name, contractor_code, photo_path)
        `)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('entry_time', { ascending: false })
        .limit(100);

      if (filters.contractorId) {
        query = query.eq('contractor_id', filters.contractorId);
      }
      if (filters.siteId) {
        query = query.eq('site_id', filters.siteId);
      }
      if (filters.dateFrom) {
        query = query.gte('entry_time', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('entry_time', filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ContractorAccessLog[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useRecordExit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await supabase
        .from('contractor_access_logs')
        .update({ exit_time: new Date().toISOString() })
        .eq('id', logId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-access-logs'] });
      toast.success('Exit recorded');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record exit: ${error.message}`);
    },
  });
}
