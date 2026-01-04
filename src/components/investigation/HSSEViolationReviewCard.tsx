import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Shield, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Building2,
  Edit,
  AlertTriangle
} from "lucide-react";
import { useCanApproveViolation, useHSSEViolationReview } from "@/hooks/use-contractor-violation";
import { useViolationTypes } from "@/hooks/use-violation-types";
import type { IncidentWithDetails } from "@/hooks/use-incidents";

interface HSSEViolationReviewCardProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

export function HSSEViolationReviewCard({ incident, onComplete }: HSSEViolationReviewCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const isArabic = i18n.language === 'ar';
  
  const [notes, setNotes] = useState("");
  const [showModifyOptions, setShowModifyOptions] = useState(false);
  const [selectedModifiedTypeId, setSelectedModifiedTypeId] = useState<string | null>(null);
  
  const { data: canApprove } = useCanApproveViolation(incident.id);
  const { data: violationTypes = [] } = useViolationTypes();
  const hsseReview = useHSSEViolationReview();
  
  // Only show for pending_hsse_violation_review status
  if ((incident.status as string) !== 'pending_hsse_violation_review') {
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
  
  const handleEnforce = () => {
    hsseReview.mutate({
      incidentId: incident.id,
      decision: 'enforce',
      notes: notes || undefined,
    }, {
      onSuccess: onComplete,
    });
  };
  
  const handleModify = () => {
    if (!selectedModifiedTypeId) return;
    
    hsseReview.mutate({
      incidentId: incident.id,
      decision: 'modify',
      notes: notes || undefined,
      modifiedViolationTypeId: selectedModifiedTypeId,
    }, {
      onSuccess: onComplete,
    });
  };
  
  const handleCancel = () => {
    hsseReview.mutate({
      incidentId: incident.id,
      decision: 'cancel',
      notes: notes || undefined,
    }, {
      onSuccess: onComplete,
    });
  };
  
  return (
    <Card className="border-purple-500/50 bg-purple-500/5" dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">
              {t('workflow.violation.hsseReview', 'HSSE Violation Review')}
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
            {t('workflow.violation.finalAuthority', 'Final Authority')}
          </Badge>
        </div>
        <CardDescription>
          {t('workflow.violation.hsseDescription', 'This violation was rejected and requires your final decision')}
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
              <Badge variant="outline" className="ms-2">
                {String(t(`violations.actionTypes.${violationDetails.penaltyType}`, violationDetails.penaltyType))}
              </Badge>
            </div>
          </div>
          
          {violationDetails.actionDescription && (
            <p className="text-sm text-muted-foreground">
              {String(violationDetails.actionDescription)}
            </p>
          )}
        </div>
        
        {/* Warning about final decision */}
        <div className="flex items-start gap-2 text-sm text-purple-700 bg-purple-50 p-3 rounded-lg border border-purple-200">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            {t('workflow.violation.finalDecisionWarning', 'Your decision is final and cannot be reversed. Choose carefully.')}
          </span>
        </div>
        
        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="hsse-notes">
            {t('workflow.violation.reviewNotes', 'Review Notes')}
          </Label>
          <Textarea
            id="hsse-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('workflow.violation.hsseNotesPlaceholder', 'Explain your decision...')}
            rows={2}
          />
        </div>
        
        {/* Modify Options */}
        {showModifyOptions && (
          <div className="space-y-2 p-3 rounded-lg border border-dashed">
            <Label>{t('workflow.violation.selectNewViolationType', 'Select New Violation Type')}</Label>
            <Select
              value={selectedModifiedTypeId || ""}
              onValueChange={setSelectedModifiedTypeId}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('workflow.violation.selectViolationType', 'Select violation type...')} />
              </SelectTrigger>
              <SelectContent>
                {violationTypes.filter(v => v.is_active).map((vt) => (
                  <SelectItem key={vt.id} value={vt.id}>
                    {isArabic && vt.name_ar ? vt.name_ar : vt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowModifyOptions(false);
                  setSelectedModifiedTypeId(null);
                }}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleModify}
                disabled={!selectedModifiedTypeId || hsseReview.isPending}
              >
                {hsseReview.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {t('workflow.violation.confirmModify', 'Confirm Modification')}
              </Button>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        {!showModifyOptions && (
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 text-gray-600 border-gray-300 hover:bg-gray-50"
              onClick={handleCancel}
              disabled={hsseReview.isPending}
            >
              {hsseReview.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {t('workflow.violation.cancelViolation', 'Cancel Violation')}
            </Button>
            
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
              onClick={() => setShowModifyOptions(true)}
              disabled={hsseReview.isPending}
            >
              <Edit className="h-4 w-4" />
              {t('workflow.violation.modifyViolation', 'Modify')}
            </Button>
            
            <Button
              className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700"
              onClick={handleEnforce}
              disabled={hsseReview.isPending}
            >
              {hsseReview.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t('workflow.violation.enforceViolation', 'Enforce Violation')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
