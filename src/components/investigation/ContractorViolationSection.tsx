import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, AlertTriangle, DollarSign, Shield, CheckCircle2 } from "lucide-react";
import { useViolationTypes, ViolationType } from "@/hooks/use-violation-types";
import { useViolationDetailsWithOccurrence } from "@/hooks/use-contractor-violation";
import type { IncidentWithDetails } from "@/hooks/use-incidents";
import { format } from "date-fns";

interface ContractorViolationSectionProps {
  incident: IncidentWithDetails;
  onViolationTypeChange?: (violationTypeId: string | null) => void;
  isEditable?: boolean;
}

export function ContractorViolationSection({ 
  incident, 
  onViolationTypeChange,
  isEditable = false 
}: ContractorViolationSectionProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const isArabic = i18n.language === 'ar';
  
  const [selectedViolationTypeId, setSelectedViolationTypeId] = useState<string | null>(
    (incident as any).violation_type_id || null
  );
  
  const { data: violationTypes = [], isLoading: loadingTypes } = useViolationTypes();
  const { data: violationDetails } = useViolationDetailsWithOccurrence(
    incident.id,
    selectedViolationTypeId
  );
  
  // Notify parent when violation type changes
  useEffect(() => {
    onViolationTypeChange?.(selectedViolationTypeId);
  }, [selectedViolationTypeId, onViolationTypeChange]);
  
  // If no contractor is linked, don't render
  if (!incident.related_contractor_company_id) {
    return null;
  }
  
  const handleViolationTypeChange = (value: string) => {
    setSelectedViolationTypeId(value);
  };
  
  // Get stored violation data from incident
  const storedViolation = {
    typeId: (incident as any).violation_type_id,
    occurrence: (incident as any).violation_occurrence,
    penaltyType: (incident as any).violation_penalty_type,
    fineAmount: (incident as any).violation_fine_amount,
    actionDescription: (incident as any).violation_action_description,
    finalStatus: (incident as any).violation_final_status,
    // Approval trail
    deptManagerDecision: (incident as any).violation_dept_manager_decision,
    deptManagerApprovedAt: (incident as any).violation_dept_manager_approved_at,
    contractControllerDecision: (incident as any).violation_contract_controller_decision,
    contractControllerApprovedAt: (incident as any).violation_contract_controller_approved_at,
    contractorRepDecision: (incident as any).violation_contractor_rep_decision,
    contractorRepAcknowledgedAt: (incident as any).violation_contractor_rep_acknowledged_at,
    hsseDecision: (incident as any).violation_hsse_decision,
    hsseDecidedAt: (incident as any).violation_hsse_decided_at,
    finalizedAt: (incident as any).violation_finalized_at,
  };
  
  const hasExistingViolation = !!storedViolation.typeId;
  const selectedType = violationTypes.find(v => v.id === (selectedViolationTypeId || storedViolation.typeId));
  
  // Determine display values
  const displayOccurrence = violationDetails?.occurrence || storedViolation.occurrence;
  const displayOccurrenceLabel = violationDetails?.occurrence_label || 
    (storedViolation.occurrence === 1 ? '1st' : storedViolation.occurrence === 2 ? '2nd' : '3rd/Repeated');
  const displayPenaltyType = violationDetails?.action_type || storedViolation.penaltyType;
  const displayFineAmount = violationDetails?.fine_amount || storedViolation.fineAmount;
  const displayActionDescription = violationDetails?.action_description || storedViolation.actionDescription;
  
  const getPenaltyBadgeVariant = (type: string) => {
    switch (type) {
      case 'fine': return 'default';
      case 'warning': return 'secondary';
      case 'suspension': return 'destructive';
      case 'site_removal': return 'destructive';
      case 'termination': return 'destructive';
      default: return 'outline';
    }
  };
  
  const getOccurrenceBadgeVariant = (occ: number) => {
    if (occ === 1) return 'secondary';
    if (occ === 2) return 'default';
    return 'destructive';
  };
  
  return (
    <Card className="border-amber-500/50 bg-amber-500/5" dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg text-amber-700 dark:text-amber-500">
              {t('workflow.violation.contractorViolation', 'Contractor Violation')}
            </CardTitle>
          </div>
          {storedViolation.finalStatus && (
            <Badge 
              variant={storedViolation.finalStatus === 'cancelled' ? 'secondary' : 'default'}
              className={storedViolation.finalStatus === 'cancelled' ? '' : 'bg-green-600'}
            >
              {storedViolation.finalStatus === 'cancelled' 
                ? t('workflow.violation.cancelled', 'Cancelled')
                : t('workflow.violation.finalized', 'Finalized')
              }
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contractor Name */}
        <div className="rounded-lg bg-muted/50 p-3">
          <Label className="text-sm text-muted-foreground">
            {t('workflow.violation.contractorName', 'Contractor')}
          </Label>
          <p className="font-medium mt-1">
            {incident.related_contractor_company?.company_name}
          </p>
        </div>
        
        {/* Violation Type Selector (editable mode) or Display */}
        {isEditable && !hasExistingViolation ? (
          <div className="space-y-2">
            <Label htmlFor="violation-type" className="flex items-center gap-1">
              {t('workflow.violation.violationType', 'Violation Type')}
              <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedViolationTypeId || ""}
              onValueChange={handleViolationTypeChange}
              disabled={loadingTypes}
            >
              <SelectTrigger id="violation-type">
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
            {!selectedViolationTypeId && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('workflow.violation.selectionRequired', 'You must select a violation type before approving.')}
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : selectedType ? (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              {t('workflow.violation.violationType', 'Violation Type')}
            </Label>
            <p className="font-medium">
              {isArabic && selectedType.name_ar ? selectedType.name_ar : selectedType.name}
            </p>
            <Badge variant="outline" className="text-xs">
              {t(`severity.${selectedType.severity_level}.label`, selectedType.severity_level)}
            </Badge>
          </div>
        ) : null}
        
        {/* Occurrence & Penalty Details */}
        {(selectedViolationTypeId || hasExistingViolation) && (displayOccurrence || displayPenaltyType) && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Occurrence */}
            {displayOccurrence && (
              <div className="rounded-lg border p-3 space-y-1">
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {t('workflow.violation.occurrence', 'Occurrence')}
                </Label>
                <Badge variant={getOccurrenceBadgeVariant(displayOccurrence)}>
                  {displayOccurrenceLabel} {t('workflow.violation.occurrence', 'Occurrence')}
                </Badge>
              </div>
            )}
            
            {/* Penalty Type */}
            {displayPenaltyType && (
              <div className="rounded-lg border p-3 space-y-1">
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {t('workflow.violation.penaltyType', 'Penalty Type')}
                </Label>
                <Badge variant={getPenaltyBadgeVariant(displayPenaltyType)}>
                  {String(t(`violations.actionTypes.${displayPenaltyType}`, displayPenaltyType))}
                </Badge>
              </div>
            )}
            
            {/* Fine Amount */}
            {displayFineAmount && displayFineAmount > 0 && (
              <div className="rounded-lg border p-3 space-y-1">
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {t('workflow.violation.fineAmount', 'Fine Amount')}
                </Label>
                <p className="font-semibold text-destructive">
                  {displayFineAmount.toLocaleString()} SAR
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Action Description */}
        {displayActionDescription && (
          <div className="rounded-lg bg-muted/50 p-3">
            <Label className="text-sm text-muted-foreground">
              {t('workflow.violation.actionDescription', 'Action Description')}
            </Label>
            <p className="text-sm mt-1">{String(displayActionDescription)}</p>
          </div>
        )}
        
        {/* Approval Trail (if finalized) */}
        {storedViolation.finalStatus && (
          <div className="rounded-lg border p-4 space-y-3">
            <Label className="font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              {t('workflow.violation.approvalTrail', 'Approval Trail')}
            </Label>
            <div className="space-y-2 text-sm">
              {storedViolation.deptManagerApprovedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('workflow.violation.deptManager', 'Dept. Manager')}
                  </span>
                  <span>
                    {storedViolation.deptManagerDecision === 'approved' ? '✓' : '✗'}{' '}
                    {format(new Date(storedViolation.deptManagerApprovedAt), 'PP')}
                  </span>
                </div>
              )}
              {storedViolation.contractControllerApprovedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('workflow.violation.contractController', 'Contract Controller')}
                  </span>
                  <span>
                    {storedViolation.contractControllerDecision === 'approved' ? '✓' : '✗'}{' '}
                    {format(new Date(storedViolation.contractControllerApprovedAt), 'PP')}
                  </span>
                </div>
              )}
              {storedViolation.contractorRepAcknowledgedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('workflow.violation.contractorRep', 'Contractor Rep')}
                  </span>
                  <span>
                    {storedViolation.contractorRepDecision === 'acknowledged' ? '✓' : '✗'}{' '}
                    {format(new Date(storedViolation.contractorRepAcknowledgedAt), 'PP')}
                  </span>
                </div>
              )}
              {storedViolation.hsseDecidedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('workflow.violation.hsseExpert', 'HSSE Expert')} ({storedViolation.hsseDecision})
                  </span>
                  <span>
                    {format(new Date(storedViolation.hsseDecidedAt), 'PP')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
