import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useCreatePurchaseRequest, useUpdatePurchaseRequest, useApprovalConfigs, PurchaseRequest } from '@/features/assets';

interface AssetPurchaseRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request?: PurchaseRequest | null;
}

const defaultForm = {
  title: "",
  description: "",
  estimated_cost: 0,
  quantity: 1,
  currency: "SAR",
  justification: "",
  vendor_name: "",
  budget_code: "",
};

export function AssetPurchaseRequestDialog({ open, onOpenChange, request }: AssetPurchaseRequestDialogProps) {
  const { t } = useTranslation();
  const createRequest = useCreatePurchaseRequest();
  const updateRequest = useUpdatePurchaseRequest();
  const { data: configs } = useApprovalConfigs("asset_purchase");
  
  const isEditMode = !!request;
  
  const [form, setForm] = useState(defaultForm);

  // Pre-populate form when editing
  useEffect(() => {
    if (request && open) {
      setForm({
        title: request.title || "",
        description: request.description || "",
        estimated_cost: request.estimated_cost || 0,
        quantity: request.quantity || 1,
        currency: request.currency || "SAR",
        justification: request.justification || "",
        vendor_name: request.vendor_name || "",
        budget_code: request.budget_code || "",
      });
    } else if (!open) {
      setForm(defaultForm);
    }
  }, [request, open]);

  const handleSubmit = async () => {
    if (isEditMode && request) {
      await updateRequest.mutateAsync({
        id: request.id,
        ...form,
      });
    } else {
      const activeConfig = configs?.find(c => c.is_active);
      await createRequest.mutateAsync({
        ...form,
        approval_config_id: activeConfig?.id,
      });
    }
    
    onOpenChange(false);
    setForm(defaultForm);
  };
  
  const isPending = createRequest.isPending || updateRequest.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode 
              ? t("purchaseRequest.editTitle", "Edit Purchase Request")
              : t("purchaseRequest.title", "New Purchase Request")
            }
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? t("purchaseRequest.editDescription", "Update the purchase request details")
              : t("purchaseRequest.description", "Submit a request for asset purchase approval")
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("purchaseRequest.itemTitle", "Item Title")} *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t("purchaseRequest.titlePlaceholder", "e.g., Fire Extinguisher - ABC Type")}
            />
          </div>
          
          <div className="space-y-2">
            <Label>{t("common.description", "Description")}</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t("purchaseRequest.descriptionPlaceholder", "Detailed description of the item...")}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("purchaseRequest.estimatedCost", "Estimated Cost")} *</Label>
              <Input
                type="number"
                value={form.estimated_cost}
                onChange={(e) => setForm({ ...form, estimated_cost: Number(e.target.value) })}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("common.quantity", "Quantity")}</Label>
              <Input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("common.currency", "Currency")}</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAR">SAR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>{t("purchaseRequest.justification", "Business Justification")} *</Label>
            <Textarea
              value={form.justification}
              onChange={(e) => setForm({ ...form, justification: e.target.value })}
              placeholder={t("purchaseRequest.justificationPlaceholder", "Explain why this purchase is needed...")}
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("purchaseRequest.vendorName", "Vendor Name")}</Label>
              <Input
                value={form.vendor_name}
                onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                placeholder={t("purchaseRequest.vendorPlaceholder", "Preferred vendor")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("purchaseRequest.budgetCode", "Budget Code")}</Label>
              <Input
                value={form.budget_code}
                onChange={(e) => setForm({ ...form, budget_code: e.target.value })}
                placeholder={t("purchaseRequest.budgetPlaceholder", "e.g., CAPEX-2024-001")}
              />
            </div>
          </div>
          
          {/* Total Display */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("purchaseRequest.totalCost", "Total Estimated Cost")}</span>
              <span className="text-xl font-bold">
                {(form.estimated_cost * form.quantity).toLocaleString()} {form.currency}
              </span>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isPending || !form.title || !form.estimated_cost || !form.justification}
          >
            {isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {isEditMode 
              ? t("common.save", "Save")
              : t("purchaseRequest.submit", "Submit Request")
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

