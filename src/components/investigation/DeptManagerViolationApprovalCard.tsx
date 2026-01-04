import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  UserCheck, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Building2,
  DollarSign
} from "lucide-react";
import { useCanApproveViolation, useDeptManagerViolationApproval } from "@/hooks/use-contractor-violation";
import type { IncidentWithDetails } from "@/hooks/use-incidents";

interface DeptManagerViolationApprovalCardProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

export function DeptManagerViolationApprovalCard({ incident, onComplete }: DeptManagerViolationApprovalCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [notes, setNotes] = useState("");
  
  const { data: canApprove } = useCanApproveViolation(incident.id);
  const deptManagerApproval = useDeptManagerViolationApproval();
  
  // Only show for pending_department_manager_violation_approval status
  if ((incident.status as string) !== 'pending_department_manager_violation_approval') {
    return null;
  }
  
  // Only show if user can approve
  if (!canApprove?.can_approve) {
    return null;
  }
  
  const violationDetails = {
    penaltyType: (incident as any).violation_penalty_type,
    fineAmount: (incident as any).violation_fine_amount,
    occurrence: (incident as any).violation_occurrence,
  };
  
  const handleApprove = () => {
    deptManagerApproval.mutate({
      incidentId: incident.id,
      decision: 'approved',
      notes: notes || undefined,
    }, {
      onSuccess: onComplete,
    });
  };
  
  const handleReject = () => {
    deptManagerApproval.mutate({
      incidentId: incident.id,
      decision: 'rejected',
      notes: notes || undefined,
    }, {
      onSuccess: onComplete,
    });
  };
  
  return (
    <Card className="border-blue-500/50 bg-blue-500/5" dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">
              {t('workflow.violation.deptManagerApproval', 'Department Manager Violation Approval')}
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            {t('workflow.pendingApproval', 'Pending Approval')}
          </Badge>
        </div>
        <CardDescription>
          {t('workflow.violation.deptManagerDescription', 'Review and approve or reject this contractor violation')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Violation Summary */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-600" />
            <span className="font-medium">
              {incident.related_contractor_company?.company_name}
            </span>
          </div>
          
          <div className="grid gap-2 md:grid-cols-3 text-sm">
            <div>
              <span className="text-muted-foreground">{t('workflow.violation.occurrence', 'Occurrence')}:</span>
              <Badge variant="secondary" className="ms-2">
                {violationDetails.occurrence === 1 ? '1st' : violationDetails.occurrence === 2 ? '2nd' : '3rd/Repeated'}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">{t('workflow.violation.penaltyType', 'Penalty')}:</span>
              <Badge variant="outline" className="ms-2">
                {String(t(`violations.actionTypes.${violationDetails.penaltyType}`, violationDetails.penaltyType))}
              </Badge>
            </div>
            {violationDetails.fineAmount && violationDetails.fineAmount > 0 && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <span className="font-semibold text-destructive">
                  {String(violationDetails.fineAmount?.toLocaleString())} SAR
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="approval-notes">
            {t('workflow.violation.approvalNotes', 'Approval Notes')}
          </Label>
          <Textarea
            id="approval-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('workflow.violation.approvalNotesPlaceholder', 'Add notes about your decision...')}
            rows={2}
          />
        </div>
        
        {/* Info about routing */}
        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
          {violationDetails.penaltyType === 'fine' 
            ? t('workflow.violation.routeToContractController', 'If approved, this will be routed to the Contract Controller for fine confirmation.')
            : t('workflow.violation.routeToContractorRep', 'If approved, this will be routed to the Contractor Site Representative for acknowledgment.')
          }
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
            onClick={handleReject}
            disabled={deptManagerApproval.isPending}
          >
            {deptManagerApproval.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {t('workflow.violation.reject', 'Reject')}
          </Button>
          
          <Button
            className="flex-1 flex items-center justify-center gap-2"
            onClick={handleApprove}
            disabled={deptManagerApproval.isPending}
          >
            {deptManagerApproval.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {t('workflow.violation.approve', 'Approve')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
