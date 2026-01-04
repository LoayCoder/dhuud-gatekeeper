import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  HardHat, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Building2,
  AlertTriangle,
  Info
} from "lucide-react";
import { useCanApproveViolation, useContractorSiteRepAcknowledge } from "@/hooks/use-contractor-violation";
import type { IncidentWithDetails } from "@/hooks/use-incidents";

interface ContractorSiteRepAcknowledgeCardProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

export function ContractorSiteRepAcknowledgeCard({ incident, onComplete }: ContractorSiteRepAcknowledgeCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [notes, setNotes] = useState("");
  
  const { data: canApprove } = useCanApproveViolation(incident.id);
  const acknowledgeViolation = useContractorSiteRepAcknowledge();
  
  // Only show for pending_contractor_site_rep_approval status
  if ((incident.status as string) !== 'pending_contractor_site_rep_approval') {
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
    actionDescription: (incident as any).violation_action_description,
  };
  
  const handleAcknowledge = () => {
    acknowledgeViolation.mutate({
      incidentId: incident.id,
      decision: 'acknowledged',
      notes: notes || undefined,
    }, {
      onSuccess: onComplete,
    });
  };
  
  const handleContest = () => {
    acknowledgeViolation.mutate({
      incidentId: incident.id,
      decision: 'rejected',
      notes: notes || undefined,
    }, {
      onSuccess: onComplete,
    });
  };
  
  return (
    <Card className="border-orange-500/50 bg-orange-500/5" dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-lg">
              {t('workflow.violation.contractorAcknowledgment', 'Contractor Violation Acknowledgment')}
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
            {t('workflow.violation.pendingAcknowledgment', 'Pending Acknowledgment')}
          </Badge>
        </div>
        <CardDescription>
          {t('workflow.violation.contractorDescription', 'Review the violation and acknowledge responsibility or contest')}
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
          
          <div className="grid gap-2 md:grid-cols-2 text-sm">
            <div>
              <span className="text-muted-foreground">{t('workflow.violation.occurrence', 'Occurrence')}:</span>
              <Badge variant="secondary" className="ms-2">
                {violationDetails.occurrence === 1 ? '1st' : violationDetails.occurrence === 2 ? '2nd' : '3rd/Repeated'}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">{t('workflow.violation.penaltyType', 'Penalty')}:</span>
              <Badge variant="destructive" className="ms-2">
                {String(t(`violations.actionTypes.${violationDetails.penaltyType}`, violationDetails.penaltyType))}
              </Badge>
            </div>
          </div>
          
          {violationDetails.actionDescription && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm font-medium text-destructive">
                {String(violationDetails.actionDescription)}
              </p>
            </div>
          )}
        </div>
        
        {/* Info about what acknowledgment means */}
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            {t('workflow.violation.acknowledgmentInfo', 'By acknowledging, you accept the violation and commit to the required corrective actions. Contesting will escalate to HSSE for final review.')}
          </AlertDescription>
        </Alert>
        
        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="contractor-notes">
            {t('workflow.violation.responseNotes', 'Response Notes')}
          </Label>
          <Textarea
            id="contractor-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('workflow.violation.contractorNotesPlaceholder', 'Add your response or corrective action commitment...')}
            rows={3}
          />
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
            onClick={handleContest}
            disabled={acknowledgeViolation.isPending}
          >
            {acknowledgeViolation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {t('workflow.violation.contest', 'Contest')}
          </Button>
          
          <Button
            className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700"
            onClick={handleAcknowledge}
            disabled={acknowledgeViolation.isPending}
          >
            {acknowledgeViolation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {t('workflow.violation.acknowledge', 'Acknowledge')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
