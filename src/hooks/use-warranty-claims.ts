import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export type WarrantyClaimStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'completed';

export interface WarrantyClaim {
  id: string;
  tenant_id: string;
  asset_id: string;
  claim_number: string;
  claim_date: string;
  issue_description: string;
  claim_status: WarrantyClaimStatus;
  vendor_name: string | null;
  vendor_contact: string | null;
  repair_cost: number | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  asset?: {
    id: string;
    name: string;
    asset_code: string;
    warranty_expiry_date: string | null;
  };
  creator?: {
    id: string;
    full_name: string | null;
  };
}

export interface CreateWarrantyClaimInput {
  asset_id: string;
  claim_number: string;
  claim_date?: string;
  issue_description: string;
  vendor_name?: string;
  vendor_contact?: string;
}

export interface UpdateWarrantyClaimInput {
  id: string;
  claim_status?: WarrantyClaimStatus;
  repair_cost?: number | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  vendor_name?: string | null;
  vendor_contact?: string | null;
}

export function useWarrantyClaims(assetId?: string) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['warranty-claims', tenantId, assetId],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('asset_warranty_claims')
        .select(`
          id, claim_number, claim_date, issue_description, claim_status,
          vendor_name, vendor_contact, repair_cost, resolution_notes, resolved_at,
          created_by, created_at, updated_at, asset_id, tenant_id,
          asset:hsse_assets!asset_warranty_claims_asset_id_fkey(
            id, name, asset_code, warranty_expiry_date
          ),
          creator:profiles!asset_warranty_claims_created_by_fkey(
            id, full_name
          )
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (assetId) {
        query = query.eq('asset_id', assetId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WarrantyClaim[];
    },
    enabled: !!tenantId,
  });
}

export function useWarrantyClaimsByStatus(status?: WarrantyClaimStatus) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['warranty-claims-by-status', tenantId, status],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('asset_warranty_claims')
        .select(`
          id, claim_number, claim_date, issue_description, claim_status,
          vendor_name, repair_cost, created_at, asset_id,
          asset:hsse_assets!asset_warranty_claims_asset_id_fkey(
            id, name, asset_code
          )
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('claim_status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useCreateWarrantyClaim() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateWarrantyClaimInput) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant or user');

      const { data, error } = await supabase
        .from('asset_warranty_claims')
        .insert({
          ...input,
          tenant_id: profile.tenant_id,
          created_by: user.id,
        })
        .select('id, claim_number')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] });
      toast.success(t('assets.warranty.claimCreated', { number: data.claim_number }));
    },
    onError: (error) => {
      console.error('Create warranty claim error:', error);
      toast.error(t('assets.warranty.claimCreateError'));
    },
  });
}

export function useUpdateWarrantyClaim() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateWarrantyClaimInput) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('asset_warranty_claims')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)
        .select('id, claim_number')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] });
      toast.success(t('assets.warranty.claimUpdated'));
    },
    onError: (error) => {
      console.error('Update warranty claim error:', error);
      toast.error(t('assets.warranty.claimUpdateError'));
    },
  });
}

export function useAssetsWithExpiringWarranty(daysAhead: number = 30) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['assets-expiring-warranty', tenantId, daysAhead],
    queryFn: async () => {
      if (!tenantId) return [];

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await supabase
        .from('hsse_assets')
        .select(`
          id, name, asset_code, warranty_expiry_date, warranty_provider,
          category:asset_categories!hsse_assets_category_id_fkey(id, name, name_ar),
          site:sites!hsse_assets_site_id_fkey(id, name)
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .not('warranty_expiry_date', 'is', null)
        .lte('warranty_expiry_date', futureDate.toISOString().split('T')[0])
        .gte('warranty_expiry_date', new Date().toISOString().split('T')[0])
        .order('warranty_expiry_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useAssetsWithExpiredWarranty() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['assets-expired-warranty', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('hsse_assets')
        .select(`
          id, name, asset_code, warranty_expiry_date, warranty_provider,
          category:asset_categories!hsse_assets_category_id_fkey(id, name, name_ar)
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .not('warranty_expiry_date', 'is', null)
        .lt('warranty_expiry_date', today)
        .order('warranty_expiry_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useAssetsWithActiveWarranty() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['assets-active-warranty', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('hsse_assets')
        .select(`
          id, name, asset_code, warranty_expiry_date, warranty_provider,
          category:asset_categories!hsse_assets_category_id_fkey(id, name, name_ar),
          site:sites!hsse_assets_site_id_fkey(id, name)
        `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .not('warranty_expiry_date', 'is', null)
        .gte('warranty_expiry_date', today)
        .order('warranty_expiry_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

// Generate unique claim number
export function generateClaimNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WC-${year}${month}-${random}`;
}
