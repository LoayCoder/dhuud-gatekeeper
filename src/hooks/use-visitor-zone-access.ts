/**
 * Visitor Zone Access Hook
 * 
 * Manages zone-based access control with time restrictions.
 * Uses existing visitor_access_rules table.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Tables } from '@/integrations/supabase/types';

export type VisitorAccessRule = Tables<'visitor_access_rules'>;

export interface ZoneAccessParams {
  visitor_id: string;
  zone_id: string;
  site_id: string;
  allowed_days?: number[];
  allowed_entry_time_from?: string;
  allowed_entry_time_until?: string;
  access_level?: 'escort_required' | 'supervised' | 'unrestricted';
  requires_induction?: boolean;
  valid_from?: string;
  valid_until?: string;
}

// Get visitor's current zone access rules
export function useVisitorZoneAccess(visitorId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['visitor-zone-access', visitorId, tenantId],
    queryFn: async () => {
      if (!tenantId || !visitorId) throw new Error('Missing params');

      const { data, error } = await supabase
        .from('visitor_access_rules')
        .select(`
          *,
          zone:zone_id(id, zone_type, risk_level)
        `)
        .eq('tenant_id', tenantId)
        .eq('visitor_id', visitorId)
        .is('deleted_at', null)
        .is('revoked_at', null)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !!visitorId,
  });
}

// Check if visitor can access zone at current time
export function useCheckZoneAccess(visitorId: string | undefined, zoneId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['check-zone-access', visitorId, zoneId, tenantId],
    queryFn: async () => {
      if (!tenantId || !visitorId || !zoneId) throw new Error('Missing params');

      const now = new Date();
      const currentDay = now.getDay(); // 0-6 (Sunday-Saturday)
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM

      const { data, error } = await supabase
        .from('visitor_access_rules')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('visitor_id', visitorId)
        .eq('zone_id', zoneId)
        .is('deleted_at', null)
        .is('revoked_at', null)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        return { allowed: false, reason: 'no_rule' };
      }

      // Check validity period
      if (data.valid_from && new Date(data.valid_from) > now) {
        return { allowed: false, reason: 'not_started' };
      }
      if (data.valid_until && new Date(data.valid_until) < now) {
        return { allowed: false, reason: 'expired' };
      }

      // Check allowed days
      if (data.allowed_days && !data.allowed_days.includes(currentDay)) {
        return { allowed: false, reason: 'wrong_day' };
      }

      // Check time window
      if (data.allowed_entry_time_from && currentTime < data.allowed_entry_time_from) {
        return { allowed: false, reason: 'too_early' };
      }
      if (data.allowed_entry_time_until && currentTime > data.allowed_entry_time_until) {
        return { allowed: false, reason: 'too_late' };
      }

      return { 
        allowed: true, 
        rule: data,
        requiresInduction: data.requires_induction,
        accessLevel: data.access_level,
      };
    },
    enabled: !!tenantId && !!visitorId && !!zoneId,
  });
}

// Assign zone access to visitor
export function useAssignZoneAccess() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (params: ZoneAccessParams) => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('visitor_access_rules')
        .insert({
          tenant_id: tenantId,
          visitor_id: params.visitor_id,
          zone_id: params.zone_id,
          site_id: params.site_id,
          allowed_days: params.allowed_days || [0, 1, 2, 3, 4, 5, 6],
          allowed_entry_time_from: params.allowed_entry_time_from || '00:00',
          allowed_entry_time_until: params.allowed_entry_time_until || '23:59',
          access_level: params.access_level || 'escort_required',
          requires_induction: params.requires_induction || false,
          valid_from: params.valid_from,
          valid_until: params.valid_until,
          is_active: true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['visitor-zone-access', variables.visitor_id] });
      queryClient.invalidateQueries({ queryKey: ['visitor-access-rules'] });
      toast({ title: t('visitors.zoneAccess.assigned', 'Zone access assigned') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });
}

// Bulk assign zones to visitor
export function useBulkAssignZoneAccess() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async ({ 
      visitorId, 
      zones 
    }: { 
      visitorId: string; 
      zones: Array<Omit<ZoneAccessParams, 'visitor_id'>>; 
    }) => {
      if (!tenantId) throw new Error('No tenant');

      const records = zones.map(zone => ({
        tenant_id: tenantId,
        visitor_id: visitorId,
        zone_id: zone.zone_id,
        site_id: zone.site_id,
        allowed_days: zone.allowed_days || [0, 1, 2, 3, 4, 5, 6],
        allowed_entry_time_from: zone.allowed_entry_time_from || '00:00',
        allowed_entry_time_until: zone.allowed_entry_time_until || '23:59',
        access_level: zone.access_level || 'escort_required',
        requires_induction: zone.requires_induction || false,
        valid_from: zone.valid_from,
        valid_until: zone.valid_until,
        is_active: true,
        created_by: user?.id,
      }));

      const { data, error } = await supabase
        .from('visitor_access_rules')
        .insert(records)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['visitor-zone-access', variables.visitorId] });
      queryClient.invalidateQueries({ queryKey: ['visitor-access-rules'] });
      toast({ title: t('visitors.zoneAccess.bulkAssigned', 'Zone access assigned for all selected zones') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });
}

// Revoke zone access
export function useRevokeZoneAccess() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ ruleId, reason }: { ruleId: string; reason?: string }) => {
      const { error } = await supabase
        .from('visitor_access_rules')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: user?.id,
          revoke_reason: reason,
          is_active: false,
        })
        .eq('id', ruleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-zone-access'] });
      queryClient.invalidateQueries({ queryKey: ['visitor-access-rules'] });
      toast({ title: t('visitors.zoneAccess.revoked', 'Zone access revoked') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });
}

// Get available zones for site
export function useAvailableZones(siteId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['available-zones', siteId, tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      let query = supabase
        .from('security_zones')
        .select('id, zone_type, risk_level')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (siteId) {
        query = query.eq('site_id', siteId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}
