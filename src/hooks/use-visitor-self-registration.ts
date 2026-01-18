/**
 * Visitor Self-Registration Hook
 * 
 * Manages public self-registration for visitors.
 * Includes public submission and admin review workflows.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export type SelfRegistrationStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface SelfRegistration {
  id: string;
  tenant_id: string;
  registration_token: string;
  full_name: string;
  phone: string;
  email: string | null;
  company_name: string;
  national_id: string;
  nationality: string | null;
  photo_path: string | null;
  id_document_path: string | null;
  id_verified: boolean;
  purpose: string | null;
  expected_visit_date: string;
  expected_visit_time: string | null;
  host_name: string | null;
  host_email: string | null;
  host_department: string | null;
  site_id: string | null;
  status: SelfRegistrationStatus;
  converted_visitor_id: string | null;
  rejection_reason: string | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  expires_at: string | null;
  deleted_at: string | null;
}

export interface CreateSelfRegistrationParams {
  tenant_id: string;
  full_name: string;
  phone: string;
  email?: string;
  company_name: string;
  national_id: string;
  nationality?: string;
  photo_path?: string;
  id_document_path?: string;
  purpose?: string;
  expected_visit_date: string;
  expected_visit_time?: string;
  host_name?: string;
  host_email?: string;
  host_department?: string;
  site_id?: string;
}

// Public: Create self-registration (no auth required)
export function useCreateSelfRegistration() {
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: CreateSelfRegistrationParams) => {
      const { data, error } = await supabase
        .from('visitor_self_registrations')
        .insert(params)
        .select('id, registration_token')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ 
        title: t('visitors.selfRegistration.success', 'Registration submitted'),
        description: t('visitors.selfRegistration.successDesc', 'You will receive confirmation once approved.')
      });
    },
    onError: (error) => {
      toast({ 
        title: t('common.error'), 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}

// Public: Get registration by token
export function useSelfRegistrationByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['self-registration-token', token],
    queryFn: async () => {
      if (!token) throw new Error('No token');

      const { data, error } = await supabase
        .from('visitor_self_registrations')
        .select('*')
        .eq('registration_token', token)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data as SelfRegistration;
    },
    enabled: !!token,
  });
}

// Admin: Get pending registrations for tenant
export function usePendingSelfRegistrations() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['pending-self-registrations', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('visitor_self_registrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SelfRegistration[];
    },
    enabled: !!tenantId,
  });
}

// Admin: Get all registrations for tenant
export function useSelfRegistrations(filters?: { status?: SelfRegistrationStatus }) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['self-registrations', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      let query = supabase
        .from('visitor_self_registrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SelfRegistration[];
    },
    enabled: !!tenantId,
  });
}

// Admin: Approve registration and create visitor
export function useApproveSelfRegistration() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      registrationId, 
      siteId 
    }: { 
      registrationId: string; 
      siteId?: string;
    }) => {
      // First get the registration details
      const { data: registration, error: fetchError } = await supabase
        .from('visitor_self_registrations')
        .select('*')
        .eq('id', registrationId)
        .single();

      if (fetchError) throw fetchError;

      // Create visitor record
      const { data: visitor, error: visitorError } = await supabase
        .from('visitors')
        .insert({
          tenant_id: registration.tenant_id,
          full_name: registration.full_name,
          phone: registration.phone,
          email: registration.email,
          company_name: registration.company_name,
          national_id: registration.national_id,
          nationality: registration.nationality,
          photo_path: registration.photo_path,
          id_document_path: registration.id_document_path,
          site_id: siteId || registration.site_id,
          is_active: true,
          qr_token: crypto.randomUUID(),
        })
        .select()
        .single();

      if (visitorError) throw visitorError;

      // Update registration status
      const { error: updateError } = await supabase
        .from('visitor_self_registrations')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          converted_visitor_id: visitor.id,
        })
        .eq('id', registrationId);

      if (updateError) throw updateError;

      return { registration, visitor };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-self-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['self-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      toast({ title: t('visitors.selfRegistration.approved', 'Registration approved') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });
}

// Admin: Reject registration
export function useRejectSelfRegistration() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      registrationId, 
      reason 
    }: { 
      registrationId: string; 
      reason: string;
    }) => {
      const { error } = await supabase
        .from('visitor_self_registrations')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', registrationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-self-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['self-registrations'] });
      toast({ title: t('visitors.selfRegistration.rejected', 'Registration rejected') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });
}

// Get tenant by slug for public registration
export function useTenantBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['tenant-slug', slug],
    queryFn: async () => {
      if (!slug) throw new Error('No slug');

      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, logo_url, slug')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return { ...data, name_ar: data.name };
      return data;
    },
    enabled: !!slug,
  });
}
