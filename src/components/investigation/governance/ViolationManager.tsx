import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Gavel, AlertTriangle, DollarSign, Trash2, Edit2 } from "lucide-react";
import { useContractViolations, useCreateContractViolation, useUpdateContractViolation, useDeleteContractViolation, type ContractViolation } from "@/hooks/use-contract-violations";
import { useUserRoles } from "@/hooks/use-user-roles";

interface ViolationManagerProps {
  incidentId: string;
  canEdit?: boolean;
}

export function ViolationManager({ incidentId, canEdit = true }: ViolationManagerProps) {
  const { t } = useTranslation();
  const { hasRole } = useUserRoles();
  const { data: violations, isLoading } = useContractViolations(incidentId);
  const createMutation = useCreateContractViolation();
  const updateMutation = useUpdateContractViolation();
  const deleteMutation = useDeleteContractViolation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingViolation, setEditingViolation] = useState<ContractViolation | null>(null);

  // Form State
  const [violationType, setViolationType] = useState("");
  const [description, setDescription] = useState("");
  const [fineAmount, setFineAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [status, setStatus] = useState<ContractViolation['status']>("draft");

  const isHSSE = hasRole("hsse_manager") || hasRole("hsse_expert");
  const canManage = canEdit && isHSSE;

  const handleOpenDialog = (violation?: ContractViolation) => {
    if (violation) {
      setEditingViolation(violation);
      setViolationType(violation.violation_type);
      setDescription(violation.description || "");
      setFineAmount(violation.fine_amount?.toString() || "");
      setCurrency(violation.currency || "USD");
      setStatus(violation.status);
    } else {
      setEditingViolation(null);
      setViolationType("");
      setDescription("");
      setFineAmount("");
      setCurrency("USD");
      setStatus("draft");
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      incident_id: incidentId,
      violation_type: violationType,
      description,
      fine_amount: fineAmount ? parseFloat(fineAmount) : null,
      currency,
      status,
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingViolation ? t('common.edit', 'Edit') : t('common.add', 'Add')} {t('governance.violation.singular', 'Violation')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('governance.violation.type', 'Type')}</Label>
              <Input value={violationType} onChange={e => setViolationType(e.target.value)} placeholder="e.g. Safety Breach" />
            </div>
            <div className="space-y-2">
              <Label>{t('governance.violation.fine', 'Fine Amount')}</Label>
              <div className="flex gap-2">
                <Input type="number" value={fineAmount} onChange={e => setFineAmount(e.target.value)} placeholder="0.00" />
                <Input className="w-24" value={currency} onChange={e => setCurrency(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('governance.violation.status', 'Status')}</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('governance.violation.description', 'Description')}</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel', 'Cancel')}</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
