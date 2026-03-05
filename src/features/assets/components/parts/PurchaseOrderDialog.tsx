import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMaintenanceParts } from '@/hooks/use-maintenance-parts';
import { useCreatePurchaseOrder } from '@/hooks/use-parts-inventory';

interface PurchaseOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedPartId?: string | null;
}

interface OrderLine {
  part_id: string;
  quantity_ordered: number;
  unit_cost: number;
}

export function PurchaseOrderDialog({ open, onOpenChange, preselectedPartId }: PurchaseOrderDialogProps) {
  const { t } = useTranslation();
  const { data: partsData } = useMaintenanceParts();
  const parts = partsData?.data || [];
  const createOrder = useCreatePurchaseOrder();

  const [supplierName, setSupplierName] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([]);

  // Add preselected part when dialog opens
  useEffect(() => {
    if (open && preselectedPartId) {
      const part = parts?.find((p) => p.id === preselectedPartId);
      if (part) {
        setLines([{
          part_id: preselectedPartId,
          quantity_ordered: Math.max(1, (part.reorder_point || 0) - (part.quantity_in_stock || 0)),
          unit_cost: Number(part.unit_cost) || 0,
        }]);
      }
    }
  }, [open, preselectedPartId, parts]);

  const handleAddLine = () => {
    setLines([...lines, { part_id: '', quantity_ordered: 1, unit_cost: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof OrderLine, value: string | number) => {
    const newLines = [...lines];
    if (field === 'part_id') {
      newLines[index].part_id = value as string;
      // Auto-fill unit cost from part
      const part = parts?.find((p) => p.id === value);
      if (part?.unit_cost) {
        newLines[index].unit_cost = Number(part.unit_cost);
      }
    } else if (field === 'quantity_ordered') {
      newLines[index].quantity_ordered = parseInt(value as string, 10) || 0;
    } else if (field === 'unit_cost') {
      newLines[index].unit_cost = parseFloat(value as string) || 0;
    }
    setLines(newLines);
  };

  const total = lines.reduce((sum, line) => sum + line.quantity_ordered * line.unit_cost, 0);

  const handleSubmit = () => {
    if (lines.length === 0 || lines.some((l) => !l.part_id || l.quantity_ordered <= 0)) {
      return;
    }

    createOrder.mutate(
      {
        supplier_name: supplierName || undefined,
        supplier_contact: supplierContact || undefined,
        order_date: orderDate || undefined,
        expected_delivery_date: expectedDate || undefined,
        notes: notes || undefined,
        lines: lines.map((l) => ({
          part_id: l.part_id,
          quantity_ordered: l.quantity_ordered,
          unit_cost: l.unit_cost || undefined,
        })),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          resetForm();
        },
      }
    );
  };

  const resetForm = () => {
    setSupplierName('');
    setSupplierContact('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setExpectedDate('');
    setNotes('');
    setLines([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('parts.orders.createTitle', 'Create Purchase Order')}</DialogTitle>
          <DialogDescription>
            {t('parts.orders.createDescription', 'Create a new purchase order for parts')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('parts.orders.supplierName', 'Supplier Name')}</Label>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder={t('parts.orders.supplierNamePlaceholder', 'Enter supplier name')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('parts.orders.supplierContact', 'Supplier Contact')}</Label>
              <Input
                value={supplierContact}
                onChange={(e) => setSupplierContact(e.target.value)}
                placeholder={t('parts.orders.supplierContactPlaceholder', 'Phone or email')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('parts.orders.orderDate', 'Order Date')}</Label>
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('parts.orders.expectedDate', 'Expected Delivery')}</Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>

          {/* Order Lines */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('parts.orders.items', 'Order Items')}</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
                <Plus className="h-4 w-4 me-2" />
                {t('parts.orders.addItem', 'Add Item')}
              </Button>
            </div>

            <div className="space-y-2">
              {lines.map((line, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Select
                      value={line.part_id}
                      onValueChange={(v) => handleLineChange(index, 'part_id', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('parts.orders.selectPart', 'Select part')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(parts || []).map((part) => (
                          <SelectItem key={part.id} value={part.id}>
                            {part.part_number} - {part.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      min="1"
                      value={line.quantity_ordered}
                      onChange={(e) => handleLineChange(index, 'quantity_ordered', e.target.value)}
                      placeholder={t('parts.orders.qty', 'Qty')}
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unit_cost}
                      onChange={(e) => handleLineChange(index, 'unit_cost', e.target.value)}
                      placeholder={t('parts.orders.cost', 'Cost')}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveLine(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}

              {lines.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('parts.orders.noItems', 'No items added. Click "Add Item" to start.')}
                </p>
              )}
            </div>
          </div>

          {lines.length > 0 && (
            <div className="flex justify-end">
              <div className="text-end">
                <p className="text-sm text-muted-foreground">{t('parts.orders.total', 'Total')}</p>
                <p className="text-lg font-bold">
                  {total.toLocaleString('en-SA', { style: 'currency', currency: 'SAR' })}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('parts.orders.notes', 'Notes')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('parts.orders.notesPlaceholder', 'Additional notes...')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={lines.length === 0 || createOrder.isPending}
          >
            {createOrder.isPending
              ? t('common.creating', 'Creating...')
              : t('parts.orders.create', 'Create PO')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
