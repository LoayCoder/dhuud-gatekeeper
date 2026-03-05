import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { CreateTransferRequest } from './types';

export function useCreateTransferRequest() {
    const queryClient = useQueryClient();
    const { profile, user } = useAuth();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (request: CreateTransferRequest) => {
            if (!profile?.tenant_id || !user?.id) throw new Error('No tenant ID');
            const { data, error } = await supabase.from('asset_transfers')
                .insert({ tenant_id: profile.tenant_id, ...request, requested_by: user.id }).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['asset-transfers', variables.asset_id] });
            queryClient.invalidateQueries({ queryKey: ['pending-transfers'] });
            toast({ title: 'Transfer request created successfully' });
        },
        onError: (error) => { toast({ title: 'Failed to create transfer request', description: error.message, variant: 'destructive' }); },
    });
}

export function useApproveTransfer() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ transferId, assetId }: { transferId: string; assetId: string }) => {
            const { error } = await supabase.from('asset_transfers').update({ status: 'approved', approved_by: user?.id, approved_at: new Date().toISOString() }).eq('id', transferId);
            if (error) throw error;
            return { transferId, assetId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['asset-transfers', data.assetId] });
            queryClient.invalidateQueries({ queryKey: ['pending-transfers'] });
            toast({ title: 'Transfer approved' });
        },
        onError: (error) => { toast({ title: 'Failed to approve transfer', description: error.message, variant: 'destructive' }); },
    });
}

export function useRejectTransfer() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ transferId, assetId, reason }: { transferId: string; assetId: string; reason: string }) => {
            const { error } = await supabase.from('asset_transfers').update({ status: 'rejected', approved_by: user?.id, approved_at: new Date().toISOString(), rejection_reason: reason }).eq('id', transferId);
            if (error) throw error;
            return { transferId, assetId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['asset-transfers', data.assetId] });
            queryClient.invalidateQueries({ queryKey: ['pending-transfers'] });
            toast({ title: 'Transfer rejected' });
        },
        onError: (error) => { toast({ title: 'Failed to reject transfer', description: error.message, variant: 'destructive' }); },
    });
}

export function useMarkInTransit() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ transferId, assetId }: { transferId: string; assetId: string }) => {
            const { error } = await supabase.from('asset_transfers').update({ status: 'in_transit' }).eq('id', transferId);
            if (error) throw error;
            return { transferId, assetId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['asset-transfers', data.assetId] });
            queryClient.invalidateQueries({ queryKey: ['pending-transfers'] });
            toast({ title: 'Asset marked as in transit' });
        },
        onError: (error) => { toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' }); },
    });
}

export function useCompleteTransfer() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ transferId, assetId }: { transferId: string; assetId: string }) => {
            const { data: transfer, error: fetchError } = await supabase.from('asset_transfers')
                .select('transfer_type, to_branch_id, to_site_id, to_building_id, to_floor_zone_id').eq('id', transferId).single();
            if (fetchError) throw fetchError;
            const { error: transferError } = await supabase.from('asset_transfers')
                .update({ status: 'completed', completed_by: user?.id, completed_at: new Date().toISOString() }).eq('id', transferId);
            if (transferError) throw transferError;
            if (transfer.transfer_type === 'location_transfer') {
                const { error } = await supabase.from('hsse_assets').update({
                    branch_id: transfer.to_branch_id, site_id: transfer.to_site_id,
                    building_id: transfer.to_building_id, floor_zone_id: transfer.to_floor_zone_id, updated_by: user?.id,
                }).eq('id', assetId);
                if (error) throw error;
            } else if (transfer.transfer_type === 'disposal') {
                const { error } = await supabase.from('hsse_assets').update({ status: 'retired', updated_by: user?.id }).eq('id', assetId);
                if (error) throw error;
            } else if (transfer.transfer_type === 'decommission') {
                const { error } = await supabase.from('hsse_assets').update({ status: 'out_of_service', updated_by: user?.id }).eq('id', assetId);
                if (error) throw error;
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
        onError: (error) => { toast({ title: 'Failed to complete transfer', description: error.message, variant: 'destructive' }); },
    });
}

export function useCancelTransfer() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ transferId, assetId }: { transferId: string; assetId: string }) => {
            const { error } = await supabase.from('asset_transfers').update({ status: 'cancelled' }).eq('id', transferId);
            if (error) throw error;
            return { transferId, assetId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['asset-transfers', data.assetId] });
            queryClient.invalidateQueries({ queryKey: ['pending-transfers'] });
            toast({ title: 'Transfer cancelled' });
        },
        onError: (error) => { toast({ title: 'Failed to cancel transfer', description: error.message, variant: 'destructive' }); },
    });
}
