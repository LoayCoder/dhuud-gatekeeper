import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';
import { useTranslation } from 'react-i18next';

export type TransactionType = 'purchase' | 'maintenance' | 'repair' | 'upgrade' | 'energy' | 'insurance' | 'disposal' | 'other';

export interface AssetCostTransaction {
  id: string;
  tenant_id: string;
  asset_id: string;
  transaction_type: TransactionType;
  amount: number;
  currency: string;
  transaction_date: string;
  description?: string;
  vendor_name?: string;
  invoice_number?: string;
  maintenance_schedule_id?: string;
  fiscal_year?: number;
  fiscal_quarter?: number;
  created_by?: string;
  created_at: string;
}

export interface CreateTransactionInput {
  asset_id: string;
  transaction_type: TransactionType;
  amount: number;
  currency?: string;
  transaction_date: string;
  description?: string;
  vendor_name?: string;
  invoice_number?: string;
  maintenance_schedule_id?: string;
}

export function useAssetCostTransactions(assetId: string | undefined) {
  const { profile, user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: ['asset-cost-transactions', assetId],
    queryFn: async () => {
      if (!assetId) return [];
      
      const { data, error } = await supabase
        .from('asset_cost_transactions')
        .select('*')
        .eq('asset_id', assetId)
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      return data as AssetCostTransaction[];
    },
    enabled: !!assetId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      const transactionDate = new Date(input.transaction_date);
      const fiscalYear = transactionDate.getFullYear();
      const fiscalQuarter = Math.ceil((transactionDate.getMonth() + 1) / 3);

      const { data, error } = await supabase
        .from('asset_cost_transactions')
        .insert({
          tenant_id: profile.tenant_id,
          asset_id: input.asset_id,
          transaction_type: input.transaction_type,
          amount: input.amount,
          currency: input.currency || 'SAR',
          transaction_date: input.transaction_date,
          description: input.description,
          vendor_name: input.vendor_name,
          invoice_number: input.invoice_number,
          maintenance_schedule_id: input.maintenance_schedule_id,
          fiscal_year: fiscalYear,
          fiscal_quarter: fiscalQuarter,
        created_by: user?.id,
      } as any)
      .select()
      .single();

    if (error) throw error;
    return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-cost-transactions', assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset-tco-summary'] });
      toast({
        title: t('assets.costs.transactionAdded', 'Transaction Added'),
        description: t('assets.costs.transactionAddedDesc', 'Cost transaction recorded successfully'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from('asset_cost_transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', transactionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-cost-transactions', assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset-tco-summary'] });
      toast({
        title: t('assets.costs.transactionDeleted', 'Transaction Deleted'),
      });
    },
  });

  // Calculate totals by type
  const totals = transactionsQuery.data?.reduce((acc, tx) => {
    acc[tx.transaction_type] = (acc[tx.transaction_type] || 0) + Number(tx.amount);
    acc.total = (acc.total || 0) + Number(tx.amount);
    return acc;
  }, {} as Record<string, number>) || {};

  return {
    transactions: transactionsQuery.data || [],
    isLoading: transactionsQuery.isLoading,
    totals,
    createTransaction: createMutation.mutate,
    deleteTransaction: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useAssetTCOSummary(assetId?: string) {
  return useQuery({
    queryKey: ['asset-tco-summary', assetId],
    queryFn: async () => {
      let query = supabase
        .from('asset_tco_summary')
        .select('*');
      
      if (assetId) {
        query = query.eq('asset_id', assetId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
