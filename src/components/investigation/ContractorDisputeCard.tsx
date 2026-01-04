import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { MessageSquareWarning, AlertTriangle, Upload, Loader2, Building2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  useCanSubmitContractorDispute, 
  useSubmitContractorDispute,
  useContractorDisputes,
  type ContractorDisputeType 
} from "@/hooks/use-contractor-dispute";

interface ContractorDisputeCardProps {
  incident: {
    id: string;
    reference_id?: string | null;
    title: string;
    status?: string | null;
    contractor_disputes_violation?: boolean | null;
    contractor_dispute_status?: string | null;
  };
  contractorId?: string;
  onComplete?: () => void;
}

const DISPUTE_TYPE_OPTIONS: Array<{ value: ContractorDisputeType; labelEn: string; labelAr: string }> = [
  { value: 'liability_denial', labelEn: 'Liability Denial', labelAr: 'رفض المسؤولية' },
  { value: 'evidence_dispute', labelEn: 'Evidence Dispute', labelAr: 'خلاف على الأدلة' },
  { value: 'procedural_issue', labelEn: 'Procedural Issue', labelAr: 'مشكلة إجرائية' },
  { value: 'other', labelEn: 'Other', labelAr: 'أخرى' },
];

const DISPUTE_STATUS_LABELS: Record<string, { en: string; ar: string; color: string }> = {
  pending_review: { en: 'Pending Review', ar: 'قيد المراجعة', color: 'bg-amber-100 text-amber-800' },
  upheld: { en: 'Upheld', ar: 'مقبول', color: 'bg-green-100 text-green-800' },
  rejected: { en: 'Rejected', ar: 'مرفوض', color: 'bg-red-100 text-red-800' },
  partially_accepted: { en: 'Partially Accepted', ar: 'مقبول جزئياً', color: 'bg-blue-100 text-blue-800' },
};

export function ContractorDisputeCard({ incident, contractorId, onComplete }: ContractorDisputeCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [disputeType, setDisputeType] = useState<ContractorDisputeType | ''>('');
  const [disputeReason, setDisputeReason] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: canSubmit, isLoading: checkingPermission } = useCanSubmitContractorDispute();
  const { data: existingDisputes, isLoading: loadingDisputes } = useContractorDisputes(incident.id);
  const { mutate: submitDispute, isPending } = useSubmitContractorDispute();

  // Check if already disputed
  const hasExistingDispute = existingDisputes && existingDisputes.length > 0;
  const latestDispute = hasExistingDispute ? existingDisputes[0] : null;

  if (checkingPermission || loadingDisputes) {
    return (
      <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
        </CardContent>
      </Card>
    );
  }

  // Show existing dispute status if already submitted
  if (hasExistingDispute && latestDispute) {
    const statusInfo = DISPUTE_STATUS_LABELS[latestDispute.status] || DISPUTE_STATUS_LABELS.pending_review;
    
    return (
      <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
              <MessageSquareWarning className="h-5 w-5" />
              {t('workflow.contractorDispute.existingTitle', 'Contractor Dispute Filed')}
            </CardTitle>
            <Badge className={statusInfo.color}>
              {isRTL ? statusInfo.ar : statusInfo.en}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">{t('workflow.contractorDispute.type', 'Dispute Type')}</Label>
            <p className="font-medium">
              {DISPUTE_TYPE_OPTIONS.find(o => o.value === latestDispute.dispute_type)?.[isRTL ? 'labelAr' : 'labelEn'] || latestDispute.dispute_type}
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">{t('workflow.contractorDispute.reason', 'Reason')}</Label>
            <p className="text-sm">{latestDispute.dispute_reason}</p>
          </div>
          {latestDispute.decision_notes && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t('workflow.contractorDispute.decisionNotes', 'Decision Notes')}</Label>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">{latestDispute.decision_notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!canSubmit) {
    return null;
  }

  const handleSubmit = () => {
    if (!disputeType || !disputeReason.trim()) return;

    submitDispute({
      incidentId: incident.id,
      contractorId,
      disputeType,
      disputeReason,
    }, {
      onSuccess: () => {
        setShowForm(false);
        setDisputeType('');
        setDisputeReason("");
        onComplete?.();
      },
    });
  };

  return (
    <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
          <MessageSquareWarning className="h-5 w-5" />
          {t('workflow.contractorDispute.title', 'Contractor Dispute')}
        </CardTitle>
        <CardDescription>
          {t('workflow.contractorDispute.description', 'If you believe the findings against the contractor are inaccurate, you can submit a formal dispute for review.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showForm ? (
          <Button 
            variant="outline" 
            onClick={() => setShowForm(true)}
            className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            <MessageSquareWarning className="h-4 w-4 me-2" />
            {t('workflow.contractorDispute.openDispute', 'Submit Dispute')}
          </Button>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('workflow.contractorDispute.warning', 'This dispute will be reviewed by the HSSE team. Please provide clear evidence and justification.')}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="dispute-type">
                {t('workflow.contractorDispute.type', 'Dispute Type')}
                <span className="text-destructive ms-1">*</span>
              </Label>
              <Select value={disputeType} onValueChange={(v) => setDisputeType(v as ContractorDisputeType)}>
                <SelectTrigger id="dispute-type">
                  <SelectValue placeholder={t('workflow.contractorDispute.selectType', 'Select dispute type')} />
                </SelectTrigger>
                <SelectContent>
                  {DISPUTE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {isRTL ? option.labelAr : option.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dispute-reason">
                {t('workflow.contractorDispute.reason', 'Dispute Reason')}
                <span className="text-destructive ms-1">*</span>
              </Label>
              <Textarea
                id="dispute-reason"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder={t('workflow.contractorDispute.reasonPlaceholder', 'Explain why you are disputing the findings...')}
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setDisputeType('');
                  setDisputeReason("");
                }}
                className="flex-1"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!disputeType || !disputeReason.trim() || isPending}
                className="flex-1"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                    {t('common.submitting', 'Submitting...')}
                  </>
                ) : (
                  t('workflow.contractorDispute.submit', 'Submit Dispute')
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
