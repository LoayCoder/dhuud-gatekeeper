import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface StockTransaction {
  id: string;
  tenant_id: string;
  part_id: string;
  transaction_type: 'receipt' | 'issue' | 'adjustment' | 'return';
  quantity: number;
  previous_quantity: number | null;
  new_quantity: number | null;
  reference_type: string | null;
  reference_id: string | null;
  unit_cost: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  tenant_id: string;
  po_number: string;
  supplier_name: string | null;
  supplier_contact: string | null;
  status: 'draft' | 'submitted' | 'approved' | 'received' | 'cancelled';
  order_date: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  total_amount: number | null;
  currency: string;
  notes: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  received_by: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderLine {
  id: string;
  tenant_id: string;
  purchase_order_id: string;
  part_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number | null;
  part?: {
    name: string;
    part_number: string;
  };
}

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

      // Filter parts where quantity_in_stock <= reorder_point
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

      // Get current stock level
      const { data: part } = await supabase
        .from('maintenance_parts')
        .select('quantity_in_stock')
        .eq('id', transaction.part_id)
        .single();

      const previousQuantity = part?.quantity_in_stock || 0;
      let newQuantity = previousQuantity;

      // Calculate new quantity based on transaction type
      if (transaction.transaction_type === 'receipt' || transaction.transaction_type === 'return') {
        newQuantity = previousQuantity + transaction.quantity;
      } else if (transaction.transaction_type === 'issue') {
        newQuantity = previousQuantity - transaction.quantity;
      } else if (transaction.transaction_type === 'adjustment') {
        newQuantity = transaction.quantity; // Adjustment sets absolute value
      }

      // Insert transaction
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

      // Update part stock level
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
      toast({
        title: t('common.success'),
        description: t('parts.stockTransactionCreated', 'Stock transaction recorded'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
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

      // Generate PO number
      const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;

      // Calculate total
      const totalAmount = order.lines.reduce(
        (sum, line) => sum + (line.quantity_ordered * (line.unit_cost || 0)),
        0
      );

      // Create order
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

      // Create order lines
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
      toast({
        title: t('common.success'),
        description: t('parts.purchaseOrderCreated', 'Purchase order created'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
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

      // If received, update stock levels
      if (status === 'received') {
        const { data: lines } = await supabase
          .from('part_purchase_order_lines')
          .select('*')
          .eq('purchase_order_id', orderId);

        for (const line of lines || []) {
          // Get current stock
          const { data: part } = await supabase
            .from('maintenance_parts')
            .select('quantity_in_stock, tenant_id')
            .eq('id', line.part_id)
            .single();

          const newQuantity = (part?.quantity_in_stock || 0) + line.quantity_ordered;

          // Update stock
          await supabase
            .from('maintenance_parts')
            .update({ quantity_in_stock: newQuantity })
            .eq('id', line.part_id);

          // Create stock transaction
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

          // Update line received quantity
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
      toast({
        title: t('common.success'),
        description: t('parts.purchaseOrderUpdated', 'Purchase order updated'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
