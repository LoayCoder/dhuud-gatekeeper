import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StockTransaction, PurchaseOrder, PurchaseOrderLine } from './types';

// Fetch low stock parts
export function useLowStockParts() {
    return useQuery({
        queryKey: ['low-stock-parts'],
        queryFn: async () => {
            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', (await supabase.auth.getUser()).data.user?.id)
                .single();

            if (!profile?.tenant_id) return [];

            const { data, error } = await supabase
                .from('maintenance_parts')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .is('deleted_at', null)
                .not('reorder_point', 'is', null);

            if (error) throw error;

            return (data || []).filter(
                (part) => (part.quantity_in_stock || 0) <= (part.reorder_point || 0)
            );
        },
    });
}

// Fetch stock transactions for a part
export function useStockTransactions(partId?: string) {
    return useQuery({
        queryKey: ['stock-transactions', partId],
        queryFn: async () => {
            if (!partId) return [];

            const { data, error } = await supabase
                .from('part_stock_transactions')
                .select('*')
                .eq('part_id', partId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data as StockTransaction[];
        },
        enabled: !!partId,
    });
}

// Fetch purchase orders
export function usePurchaseOrders(status?: string) {
    return useQuery({
        queryKey: ['purchase-orders', status],
        queryFn: async () => {
            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', (await supabase.auth.getUser()).data.user?.id)
                .single();

            if (!profile?.tenant_id) return [];

            let query = supabase
                .from('part_purchase_orders')
                .select('*')
                .eq('tenant_id', profile.tenant_id)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data as PurchaseOrder[];
        },
    });
}

// Fetch purchase order with lines
export function usePurchaseOrder(orderId?: string) {
    return useQuery({
        queryKey: ['purchase-order', orderId],
        queryFn: async () => {
            if (!orderId) return null;

            const { data: order, error: orderError } = await supabase
                .from('part_purchase_orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (orderError) throw orderError;

            const { data: lines, error: linesError } = await supabase
                .from('part_purchase_order_lines')
                .select(`
          *,
          part:maintenance_parts(name, part_number)
        `)
                .eq('purchase_order_id', orderId)
                .is('deleted_at', null);

            if (linesError) throw linesError;

            return { ...order, lines } as PurchaseOrder & { lines: PurchaseOrderLine[] };
        },
        enabled: !!orderId,
    });
}
