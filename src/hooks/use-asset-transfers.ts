import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

export type TransferType = 'location_transfer' | 'disposal' | 'decommission';
export type TransferStatus = 'pending' | 'approved' | 'rejected' | 'in_transit' | 'completed' | 'cancelled';
export type DisposalMethod = 'sold' | 'scrapped' | 'donated' | 'recycled' | 'returned';

export interface AssetTransfer {
  id: string;
  asset_id: string;
  transfer_type: TransferType;
  status: TransferStatus;
  from_branch_id: string | null;
  from_site_id: string | null;
  from_building_id: string | null;
  from_floor_zone_id: string | null;
  to_branch_id: string | null;
  to_site_id: string | null;
  to_building_id: string | null;
  to_floor_zone_id: string | null;
  disposal_method: DisposalMethod | null;
  disposal_value: number | null;
  disposal_notes: string | null;
  reason: string;
  notes: string | null;
  requested_by: string;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  completed_by: string | null;
  completed_at: string | null;
  // Joined fields
  asset?: { id: string; name: string; asset_code: string };
  from_branch?: { id: string; name: string };
  from_site?: { id: string; name: string };
  from_building?: { id: string; name: string; name_ar: string | null };
  from_floor_zone?: { id: string; name: string; name_ar: string | null };
  to_branch?: { id: string; name: string };
  to_site?: { id: string; name: string };
  to_building?: { id: string; name: string; name_ar: string | null };
  to_floor_zone?: { id: string; name: string; name_ar: string | null };
  requested_by_profile?: { id: string; full_name: string };
  approved_by_profile?: { id: string; full_name: string };
  completed_by_profile?: { id: string; full_name: string };
}

export interface CreateTransferRequest {
  asset_id: string;
  transfer_type: TransferType;
  from_branch_id?: string | null;
  from_site_id?: string | null;
  from_building_id?: string | null;
  from_floor_zone_id?: string | null;
  to_branch_id?: string | null;
  to_site_id?: string | null;
  to_building_id?: string | null;
  to_floor_zone_id?: string | null;
  disposal_method?: DisposalMethod | null;
  disposal_value?: number | null;
  disposal_notes?: string | null;
  reason: string;
  notes?: string | null;
}

// Fetch transfers for a specific asset
export function useAssetTransfers(assetId: string | undefined) {
  return useQuery({
    queryKey: ['asset-transfers', assetId],
    queryFn: async () => {
      if (!assetId) return [];
      
      const { data, error } = await supabase
        .from('asset_transfers')
        .select(`
          id, asset_id, transfer_type, status,
          from_branch_id, from_site_id, from_building_id, from_floor_zone_id,
          to_branch_id, to_site_id, to_building_id, to_floor_zone_id,
          disposal_method, disposal_value, disposal_notes,
          reason, notes,
          requested_by, requested_at, approved_by, approved_at,
          rejection_reason, completed_by, completed_at,
          from_branch:branches!asset_transfers_from_branch_id_fkey(id, name),
          from_site:sites!asset_transfers_from_site_id_fkey(id, name),
          from_building:buildings!asset_transfers_from_building_id_fkey(id, name, name_ar),
          from_floor_zone:floors_zones!asset_transfers_from_floor_zone_id_fkey(id, name, name_ar),
          to_branch:branches!asset_transfers_to_branch_id_fkey(id, name),
          to_site:sites!asset_transfers_to_site_id_fkey(id, name),
          to_building:buildings!asset_transfers_to_building_id_fkey(id, name, name_ar),
          to_floor_zone:floors_zones!asset_transfers_to_floor_zone_id_fkey(id, name, name_ar),
          requested_by_profile:profiles!asset_transfers_requested_by_fkey(id, full_name),
          approved_by_profile:profiles!asset_transfers_approved_by_fkey(id, full_name),
          completed_by_profile:profiles!asset_transfers_completed_by_fkey(id, full_name)
        `)
        .eq('asset_id', assetId)
        .is('deleted_at', null)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data as unknown as AssetTransfer[];
    },
    enabled: !!assetId,
  });
}

// Fetch pending transfers for dashboard
export function usePendingTransfers() {
  return useQuery({
    queryKey: ['pending-transfers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_transfers')
        .select(`
          id, asset_id, transfer_type, status, reason, requested_at,
          asset:hsse_assets!asset_transfers_asset_id_fkey(id, name, asset_code),
          requested_by_profile:profiles!asset_transfers_requested_by_fkey(id, full_name)
        `)
        .eq('status', 'pending')
        .is('deleted_at', null)
        .order('requested_at', { ascending: true })
        .limit(10);

      if (error) throw error;
      return data as unknown as AssetTransfer[];
    },
  });
}

// Create transfer request
export function useCreateTransferRequest() {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: CreateTransferRequest) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant ID');

      const { data, error } = await supabase
        .from('asset_transfers')
        .insert({
          tenant_id: profile.tenant_id,
          ...request,
          requested_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['asset-transfers', variables.asset_id] });
      queryClient.invalidateQueries({ queryKey: ['pending-transfers'] });
      toast({ title: 'Transfer request created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create transfer request', description: error.message, variant: 'destructive' });
    },
  });
}

// Approve transfer
export function useApproveTransfer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ transferId, assetId }: { transferId: string; assetId: string }) => {
      const { error } = await supabase
        .from('asset_transfers')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', transferId);

      if (error) throw error;
      return { transferId, assetId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asset-transfers', data.assetId] });
      queryClient.invalidateQueries({ queryKey: ['pending-transfers'] });
      toast({ title: 'Transfer approved' });
    },
    onError: (error) => {
      toast({ title: 'Failed to approve transfer', description: error.message, variant: 'destructive' });
    },
  });
}

// Reject transfer
export function useRejectTransfer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ transferId, assetId, reason }: { transferId: string; assetId: string; reason: string }) => {
      const { error } = await supabase
        .from('asset_transfers')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', transferId);

      if (error) throw error;
      return { transferId, assetId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asset-transfers', data.assetId] });
      queryClient.invalidateQueries({ queryKey: ['pending-transfers'] });
      toast({ title: 'Transfer rejected' });
    },
    onError: (error) => {
      toast({ title: 'Failed to reject transfer', description: error.message, variant: 'destructive' });
    },
  });
}

// Mark as in transit
export function useMarkInTransit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ transferId, assetId }: { transferId: string; assetId: string }) => {
      const { error } = await supabase
        .from('asset_transfers')
        .update({ status: 'in_transit' })
        .eq('id', transferId);

      if (error) throw error;
      return { transferId, assetId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asset-transfers', data.assetId] });
      queryClient.invalidateQueries({ queryKey: ['pending-transfers'] });
      toast({ title: 'Asset marked as in transit' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' });
    },
  });
}

// Complete transfer and update asset
export function useCompleteTransfer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ transferId, assetId }: { transferId: string; assetId: string }) => {
      // Get transfer details
      const { data: transfer, error: fetchError } = await supabase
        .from('asset_transfers')
        .select('transfer_type, to_branch_id, to_site_id, to_building_id, to_floor_zone_id')
        .eq('id', transferId)
        .single();

      if (fetchError) throw fetchError;

      // Update transfer status
      const { error: transferError } = await supabase
        .from('asset_transfers')
        .update({
          status: 'completed',
          completed_by: user?.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', transferId);

      if (transferError) throw transferError;

      // Update asset based on transfer type
      if (transfer.transfer_type === 'location_transfer') {
        const { error: assetError } = await supabase
          .from('hsse_assets')
          .update({
            branch_id: transfer.to_branch_id,
            site_id: transfer.to_site_id,
            building_id: transfer.to_building_id,
            floor_zone_id: transfer.to_floor_zone_id,
            updated_by: user?.id,
          })
          .eq('id', assetId);

        if (assetError) throw assetError;
      } else if (transfer.transfer_type === 'disposal') {
        const { error: assetError } = await supabase
          .from('hsse_assets')
          .update({
            status: 'retired',
            updated_by: user?.id,
          })
          .eq('id', assetId);

        if (assetError) throw assetError;
      } else if (transfer.transfer_type === 'decommission') {
        const { error: assetError } = await supabase
          .from('hsse_assets')
          .update({
            status: 'out_of_service',
            updated_by: user?.id,
          })
          .eq('id', assetId);

        if (assetError) throw assetError;
      }

      return { transferId, assetId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asset-transfers', data.assetId] });
      queryClient.invalidateQueries({ queryKey: ['pending-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['asset', data.assetId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast({ title: 'Transfer completed successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to complete transfer', description: error.message, variant: 'destructive' });
    },
  });
}

// Cancel transfer
export function useCancelTransfer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ transferId, assetId }: { transferId: string; assetId: string }) => {
      const { error } = await supabase
        .from('asset_transfers')
        .update({ status: 'cancelled' })
        .eq('id', transferId);

      if (error) throw error;
      return { transferId, assetId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asset-transfers', data.assetId] });
      queryClient.invalidateQueries({ queryKey: ['pending-transfers'] });
      toast({ title: 'Transfer cancelled' });
    },
    onError: (error) => {
      toast({ title: 'Failed to cancel transfer', description: error.message, variant: 'destructive' });
    },
  });
}
