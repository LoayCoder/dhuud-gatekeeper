import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Gavel, AlertTriangle, RotateCcw, CheckCircle, XCircle, Loader2, FileText } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  useCanMediateDispute, 
  useMediationDecision, 
  type MediationDecision 
} from "@/hooks/use-dispute-resolution";

interface DisputeResolutionCardProps {
  incident: {
    id: string;
    reference_id?: string | null;
    title: string;
    status?: string | null;
    dispute_category?: string | null;
    dispute_opened_at?: string | null;
    dispute_opened_by?: string | null;
    mediation_notes?: string | null;
    dispute_evidence_attachments?: string[] | null;
    manager_rejection_reason?: string | null;
  };
  investigation?: {
    investigator_id?: string | null;
    findings_summary?: string | null;
  } | null;
  onComplete?: () => void;
}

const DISPUTE_CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  investigation_scope: { en: 'Investigation Scope', ar: 'نطاق التحقيق' },
  findings_accuracy: { en: 'Findings Accuracy', ar: 'دقة النتائج' },
  timeline: { en: 'Timeline Dispute', ar: 'خلاف الجدول الزمني' },
  other: { en: 'Other', ar: 'أخرى' },
};

export function DisputeResolutionCard({ incident, investigation, onComplete }: DisputeResolutionCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [selectedDecision, setSelectedDecision] = useState<MediationDecision | null>(null);
  const [notes, setNotes] = useState("");

  const { data: canMediate, isLoading: checkingPermission } = useCanMediateDispute();
  const { mutate: submitDecision, isPending } = useMediationDecision();

  // Only show for incidents in dispute resolution
  if (incident.status !== 'dispute_resolution') {
    return null;
  }

  if (checkingPermission) {
    return (
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
        </CardContent>
      </Card>
    );
  }

  if (!canMediate) {
    return (
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <Gavel className="h-5 w-5" />
            {t('workflow.dispute.pendingTitle', 'Dispute Under Mediation')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('workflow.dispute.awaitingMediation', 'This dispute is awaiting HSSE Manager mediation.')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = () => {
    if (!selectedDecision || !notes.trim()) return;

    submitDecision({
      incidentId: incident.id,
      decision: selectedDecision,
      notes,
    }, {
      onSuccess: () => {
        onComplete?.();
      },
    });
  };

  const categoryLabel = incident.dispute_category
    ? DISPUTE_CATEGORY_LABELS[incident.dispute_category]?.[isRTL ? 'ar' : 'en'] || incident.dispute_category
    : t('workflow.dispute.unspecified', 'Unspecified');

  const decisionOptions = [
    {
      value: 'override_rejection' as const,
      label: t('workflow.dispute.override', 'Override Rejection'),
      description: t('workflow.dispute.overrideDesc', 'Agree with investigator. Proceed to closure despite manager objection.'),
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      value: 'maintain_rejection' as const,
      label: t('workflow.dispute.maintain', 'Maintain Rejection'),
      description: t('workflow.dispute.maintainDesc', 'Agree with manager. Investigation must be reworked.'),
      icon: XCircle,
      color: 'text-red-600',
    },
    {
      value: 'partial_rework' as const,
      label: t('workflow.dispute.partialRework', 'Partial Rework'),
      description: t('workflow.dispute.partialReworkDesc', 'Some aspects need revision. Investigation reopened with specific scope.'),
      icon: RotateCcw,
      color: 'text-amber-600',
    },
  ];

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <Gavel className="h-5 w-5" />
            {t('workflow.dispute.title', 'Dispute Resolution')}
          </CardTitle>
          <Badge variant="outline" className="border-amber-300 text-amber-700">
            {categoryLabel}
          </Badge>
        </div>
        <CardDescription>
          {t('workflow.dispute.description', 'The investigator has disputed the manager\'s rejection. Review the case and make a mediation decision.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dispute Summary */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              {t('workflow.dispute.managerReason', 'Manager\'s Rejection Reason')}
            </Label>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
              <p className="text-sm">{incident.manager_rejection_reason || t('common.notProvided', 'Not provided')}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              {t('workflow.dispute.investigatorResponse', 'Investigator\'s Dispute Notes')}
            </Label>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
              <p className="text-sm">{incident.mediation_notes || t('common.notProvided', 'Not provided')}</p>
            </div>
          </div>
        </div>

        {investigation?.findings_summary && (
          <div className="space-y-2">
            <Label className="text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('workflow.dispute.investigationSummary', 'Investigation Summary')}
            </Label>
            <div className="p-3 bg-muted/50 border rounded-lg">
              <p className="text-sm">{investigation.findings_summary}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Label>{t('workflow.dispute.decision', 'Mediation Decision')}</Label>
          <RadioGroup
            value={selectedDecision || ''}
            onValueChange={(v) => setSelectedDecision(v as MediationDecision)}
            className="space-y-3"
          >
            {decisionOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedDecision === option.value
                      ? 'border-amber-400 bg-amber-100/50 dark:bg-amber-900/20'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedDecision(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${option.color}`} />
                      <Label htmlFor={option.value} className="font-medium cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mediation-notes">
            {t('workflow.dispute.mediationNotes', 'Mediation Justification')}
            <span className="text-destructive ms-1">*</span>
          </Label>
          <Textarea
            id="mediation-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('workflow.dispute.notesPlaceholder', 'Explain your mediation decision and rationale...')}
            rows={4}
          />
          {selectedDecision && !notes.trim() && (
            <p className="text-sm text-destructive">
              {t('workflow.dispute.notesRequired', 'Justification is required for mediation decisions.')}
            </p>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!selectedDecision || !notes.trim() || isPending}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin me-2" />
              {t('common.processing', 'Processing...')}
            </>
          ) : (
            t('workflow.dispute.submit', 'Submit Mediation Decision')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
