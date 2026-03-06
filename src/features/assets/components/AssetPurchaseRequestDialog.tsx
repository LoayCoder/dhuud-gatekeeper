import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useCreatePurchaseRequest, useUpdatePurchaseRequest, useApprovalConfigs, PurchaseRequest } from '@/features/assets';
import { assetPurchaseRequestSchema, type AssetPurchaseRequestFormValues } from './AssetPurchaseRequestSchema';

interface AssetPurchaseRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request?: PurchaseRequest | null;
}

const defaultValues: AssetPurchaseRequestFormValues = {
  title: "", description: "", estimated_cost: 0, quantity: 1,
  currency: "SAR", justification: "", vendor_name: "", budget_code: "",
};

export function AssetPurchaseRequestDialog({ open, onOpenChange, request }: AssetPurchaseRequestDialogProps) {
  const { t } = useTranslation();
  const createRequest = useCreatePurchaseRequest();
  const updateRequest = useUpdatePurchaseRequest();
  const { data: configs } = useApprovalConfigs("asset_purchase");
  const isEditMode = !!request;

  const form = useForm<AssetPurchaseRequestFormValues>({
    resolver: zodResolver(assetPurchaseRequestSchema),
    defaultValues,
  });

  const watchedCost = form.watch('estimated_cost');
  const watchedQuantity = form.watch('quantity');
  const watchedCurrency = form.watch('currency');

  useEffect(() => {
    if (request && open) {
      form.reset({
        title: request.title || "", description: request.description || "",
        estimated_cost: request.estimated_cost || 0, quantity: request.quantity || 1,
        currency: request.currency || "SAR", justification: request.justification || "",
        vendor_name: request.vendor_name || "", budget_code: request.budget_code || "",
      });
    } else if (!open) {
      form.reset(defaultValues);
    }
  }, [request, open, form]);

  const onSubmit = async (values: AssetPurchaseRequestFormValues) => {
    if (isEditMode && request) {
      await updateRequest.mutateAsync({ id: request.id, title: values.title, description: values.description, estimated_cost: values.estimated_cost, quantity: values.quantity, currency: values.currency, justification: values.justification, vendor_name: values.vendor_name, budget_code: values.budget_code });
    } else {
      const activeConfig = configs?.find(c => c.is_active);
      await createRequest.mutateAsync({ title: values.title, description: values.description, estimated_cost: values.estimated_cost, quantity: values.quantity, currency: values.currency, justification: values.justification, vendor_name: values.vendor_name, budget_code: values.budget_code, approval_config_id: activeConfig?.id });
    }
    onOpenChange(false);
    form.reset(defaultValues);
  };

  const isPending = createRequest.isPending || updateRequest.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("purchaseRequest.editTitle", "Edit Purchase Request") : t("purchaseRequest.title", "New Purchase Request")}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? t("purchaseRequest.editDescription", "Update the purchase request details") : t("purchaseRequest.description", "Submit a request for asset purchase approval")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>{t("purchaseRequest.itemTitle", "Item Title")} *</FormLabel>
                <FormControl><Input {...field} placeholder={t("purchaseRequest.titlePlaceholder", "e.g., Fire Extinguisher - ABC Type")} /></FormControl>
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>{t("common.description", "Description")}</FormLabel>
                <FormControl><Textarea {...field} placeholder={t("purchaseRequest.descriptionPlaceholder", "Detailed description of the item...")} rows={3} /></FormControl>
              </FormItem>
            )} />

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="estimated_cost" render={({ field }) => (
                <FormItem><FormLabel>{t("purchaseRequest.estimatedCost", "Estimated Cost")} *</FormLabel>
                  <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} min={0} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem><FormLabel>{t("common.quantity", "Quantity")}</FormLabel>
                  <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} min={1} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="currency" render={({ field }) => (
                <FormItem><FormLabel>{t("common.currency", "Currency")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="SAR">SAR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="justification" render={({ field }) => (
              <FormItem><FormLabel>{t("purchaseRequest.justification", "Business Justification")} *</FormLabel>
                <FormControl><Textarea {...field} placeholder={t("purchaseRequest.justificationPlaceholder", "Explain why this purchase is needed...")} rows={3} /></FormControl>
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="vendor_name" render={({ field }) => (
                <FormItem><FormLabel>{t("purchaseRequest.vendorName", "Vendor Name")}</FormLabel>
                  <FormControl><Input {...field} placeholder={t("purchaseRequest.vendorPlaceholder", "Preferred vendor")} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="budget_code" render={({ field }) => (
                <FormItem><FormLabel>{t("purchaseRequest.budgetCode", "Budget Code")}</FormLabel>
                  <FormControl><Input {...field} placeholder={t("purchaseRequest.budgetPlaceholder", "e.g., CAPEX-2024-001")} /></FormControl>
                </FormItem>
              )} />
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("purchaseRequest.totalCost", "Total Estimated Cost")}</span>
                <span className="text-xl font-bold">
                  {(watchedCost * watchedQuantity).toLocaleString()} {watchedCurrency}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={isPending || !form.formState.isValid}>
                {isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {isEditMode ? t("common.save", "Save") : t("purchaseRequest.submit", "Submit Request")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
