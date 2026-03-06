import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Loader2, Plus, Gavel, DollarSign, Trash2, Edit2 } from "lucide-react";
import { useContractViolations, useCreateContractViolation, useUpdateContractViolation, useDeleteContractViolation, type ContractViolation } from "@/hooks/use-contract-violations";
import { useUserRoles } from '@/features/users';
import { violationFormSchema, type ViolationFormValues } from './ViolationManagerSchema';

interface ViolationManagerProps {
  incidentId: string;
  canEdit?: boolean;
}

const defaultValues: ViolationFormValues = {
  violationType: '', description: '', fineAmount: '', currency: 'USD', status: 'draft',
};

export function ViolationManager({ incidentId, canEdit = true }: ViolationManagerProps) {
  const { t } = useTranslation();
  const { hasRole } = useUserRoles();
  const { data: violations, isLoading } = useContractViolations(incidentId);
  const createMutation = useCreateContractViolation();
  const updateMutation = useUpdateContractViolation();
  const deleteMutation = useDeleteContractViolation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingViolation, setEditingViolation] = useState<ContractViolation | null>(null);

  const form = useForm<ViolationFormValues>({
    resolver: zodResolver(violationFormSchema),
    defaultValues,
  });

  const isHSSE = hasRole("hsse_manager") || hasRole("hsse_expert");
  const canManage = canEdit && isHSSE;

  const handleOpenDialog = (violation?: ContractViolation) => {
    if (violation) {
      setEditingViolation(violation);
      form.reset({
        violationType: violation.violation_type,
        description: violation.description || "",
        fineAmount: violation.fine_amount?.toString() || "",
        currency: violation.currency || "USD",
        status: violation.status as ViolationFormValues['status'],
      });
    } else {
      setEditingViolation(null);
      form.reset(defaultValues);
    }
    setDialogOpen(true);
  };

  const onSubmit = async (values: ViolationFormValues) => {
    const payload = {
      incident_id: incidentId,
      violation_type: values.violationType,
      description: values.description,
      fine_amount: values.fineAmount ? parseFloat(values.fineAmount) : null,
      currency: values.currency,
      status: values.status,
    };

    if (editingViolation) {
      await updateMutation.mutateAsync({ id: editingViolation.id, updates: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('common.confirmDelete', 'Are you sure?'))) {
      await deleteMutation.mutateAsync({ id, incidentId });
    }
  };

  if (isLoading) return <Loader2 className="h-6 w-6 animate-spin" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            {t('governance.violations.title', 'Contract Violations')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('governance.violations.description', 'Manage compliance breaches and liabilities.')}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => handleOpenDialog()} size="sm">
            <Plus className="h-4 w-4 me-2" />
            {t('common.add', 'Add Violation')}
          </Button>
        )}
      </div>

      {violations?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>{t('governance.violations.empty', 'No violations recorded.')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {violations?.map((violation) => (
            <Card key={violation.id}>
              <CardContent className="p-4 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{violation.violation_type}</h4>
                    <Badge variant={
                      violation.status === 'finalized' ? 'default' :
                      violation.status === 'rejected' ? 'destructive' : 'secondary'
                    }>
                      {violation.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{violation.description}</p>
                  {violation.fine_amount && (
                    <div className="flex items-center gap-1 text-sm font-medium text-destructive mt-2">
                      <DollarSign className="h-4 w-4" />
                      {violation.fine_amount} {violation.currency}
                    </div>
                  )}
                </div>
                {canManage && (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(violation)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(violation.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingViolation ? t('common.edit', 'Edit') : t('common.add', 'Add')} {t('governance.violation.singular', 'Violation')}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="violationType" render={({ field }) => (
                <FormItem><FormLabel>{t('governance.violation.type', 'Type')}</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. Safety Breach" /></FormControl>
                </FormItem>
              )} />
              <div className="space-y-2">
                <FormLabel>{t('governance.violation.fine', 'Fine Amount')}</FormLabel>
                <div className="flex gap-2">
                  <FormField control={form.control} name="fineAmount" render={({ field }) => (
                    <FormItem className="flex-1"><FormControl><Input type="number" {...field} placeholder="0.00" /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem><FormControl><Input className="w-24" {...field} /></FormControl></FormItem>
                  )} />
                </div>
              </div>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>{t('governance.violation.status', 'Status')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_approval">Pending Approval</SelectItem>
                      <SelectItem value="finalized">Finalized</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>{t('governance.violation.description', 'Description')}</FormLabel>
                  <FormControl><Textarea {...field} rows={3} /></FormControl>
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save', 'Save')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
