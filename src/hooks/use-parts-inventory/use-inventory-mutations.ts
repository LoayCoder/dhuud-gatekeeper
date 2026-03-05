import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { StockTransaction, PurchaseOrder } from './types';

// Create stock transaction
export function useCreateStockTransaction() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (transaction: Omit<StockTransaction, 'id' | 'tenant_id' | 'created_at' | 'created_by' | 'previous_quantity' | 'new_quantity'>) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            if (!profile?.tenant_id) throw new Error('Tenant not found');

            const { data: part } = await supabase
                .from('maintenance_parts')
                .select('quantity_in_stock')
                .eq('id', transaction.part_id)
                .single();

            const previousQuantity = part?.quantity_in_stock || 0;
            let newQuantity = previousQuantity;

            if (transaction.transaction_type === 'receipt' || transaction.transaction_type === 'return') {
                newQuantity = previousQuantity + transaction.quantity;
            } else if (transaction.transaction_type === 'issue') {
                newQuantity = previousQuantity - transaction.quantity;
            } else if (transaction.transaction_type === 'adjustment') {
                newQuantity = transaction.quantity;
            }

            const { data, error } = await supabase
                .from('part_stock_transactions')
                .insert({
                    ...transaction,
                    tenant_id: profile.tenant_id,
                    created_by: user.id,
                    previous_quantity: previousQuantity,
                    new_quantity: newQuantity,
                })
                .select()
                .single();

            if (error) throw error;

            const { error: updateError } = await supabase
                .from('maintenance_parts')
                .update({ quantity_in_stock: newQuantity })
                .eq('id', transaction.part_id);

            if (updateError) throw updateError;

            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['stock-transactions', variables.part_id] });
            queryClient.invalidateQueries({ queryKey: ['maintenance-parts'] });
            queryClient.invalidateQueries({ queryKey: ['low-stock-parts'] });
            toast({ title: t('common.success'), description: t('parts.stockTransactionCreated', 'Stock transaction recorded') });
        },
        onError: (error: Error) => {
            toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
        },
    });
}

// Create purchase order
export function useCreatePurchaseOrder() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (order: {
            supplier_name?: string;
            supplier_contact?: string;
            order_date?: string;
            expected_delivery_date?: string;
            notes?: string;
            lines: { part_id: string; quantity_ordered: number; unit_cost?: number }[];
        }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            if (!profile?.tenant_id) throw new Error('Tenant not found');

            const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;

            const totalAmount = order.lines.reduce(
                (sum, line) => sum + (line.quantity_ordered * (line.unit_cost || 0)),
                0
            );

            const { data: newOrder, error: orderError } = await supabase
                .from('part_purchase_orders')
                .insert({
                    tenant_id: profile.tenant_id,
                    po_number: poNumber,
                    supplier_name: order.supplier_name,
                    supplier_contact: order.supplier_contact,
                    order_date: order.order_date,
                    expected_delivery_date: order.expected_delivery_date,
                    notes: order.notes,
                    total_amount: totalAmount,
                    created_by: user.id,
                    status: 'draft',
                })
                .select()
                .single();

            if (orderError) throw orderError;

            const lines = order.lines.map((line) => ({
                tenant_id: profile.tenant_id,
                purchase_order_id: newOrder.id,
                part_id: line.part_id,
                quantity_ordered: line.quantity_ordered,
                unit_cost: line.unit_cost,
            }));

            const { error: linesError } = await supabase
                .from('part_purchase_order_lines')
                .insert(lines);

            if (linesError) throw linesError;

            return newOrder;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            toast({ title: t('common.success'), description: t('parts.purchaseOrderCreated', 'Purchase order created') });
        },
        onError: (error: Error) => {
            toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
        },
    });
}

// Update purchase order status
export function useUpdatePurchaseOrderStatus() {
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ orderId, status }: { orderId: string; status: PurchaseOrder['status'] }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const updates: Partial<PurchaseOrder> = { status };

            if (status === 'approved') {
                updates.approved_by = user.id;
                updates.approved_at = new Date().toISOString();
            } else if (status === 'received') {
                updates.received_by = user.id;
                updates.received_at = new Date().toISOString();
                updates.actual_delivery_date = new Date().toISOString().split('T')[0];
            }

            const { data, error } = await supabase
                .from('part_purchase_orders')
                .update(updates)
                .eq('id', orderId)
                .select()
                .single();

            if (error) throw error;

            if (status === 'received') {
                const { data: lines } = await supabase
                    .from('part_purchase_order_lines')
                    .select('*')
                    .eq('purchase_order_id', orderId);

                for (const line of lines || []) {
                    const { data: part } = await supabase
                        .from('maintenance_parts')
                        .select('quantity_in_stock, tenant_id')
                        .eq('id', line.part_id)
                        .single();

                    const newQuantity = (part?.quantity_in_stock || 0) + line.quantity_ordered;

                    await supabase
                        .from('maintenance_parts')
                        .update({ quantity_in_stock: newQuantity })
                        .eq('id', line.part_id);

                    await supabase
                        .from('part_stock_transactions')
                        .insert({
                            tenant_id: part?.tenant_id,
                            part_id: line.part_id,
                            transaction_type: 'receipt',
                            quantity: line.quantity_ordered,
                            previous_quantity: part?.quantity_in_stock || 0,
                            new_quantity: newQuantity,
                            reference_type: 'purchase_order',
                            reference_id: orderId,
                            unit_cost: line.unit_cost,
                            created_by: user.id,
                        });

                    await supabase
                        .from('part_purchase_order_lines')
                        .update({ quantity_received: line.quantity_ordered })
                        .eq('id', line.id);
                }
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            queryClient.invalidateQueries({ queryKey: ['maintenance-parts'] });
            queryClient.invalidateQueries({ queryKey: ['low-stock-parts'] });
            toast({ title: t('common.success'), description: t('parts.purchaseOrderUpdated', 'Purchase order updated') });
        },
        onError: (error: Error) => {
            toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
        },
    });
}
