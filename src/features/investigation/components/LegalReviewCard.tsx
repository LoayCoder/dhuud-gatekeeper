import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Scale, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCanPerformLegalReview, useLegalReview, type LegalDecision } from "@/hooks/use-legal-review";

interface LegalReviewCardProps {
  incident: {
    id: string;
    reference_id?: string | null;
    title: string;
    status?: string | null;
    severity_v2?: string | null;
    has_injury?: boolean | null;
    event_type?: string | null;
    requires_legal_review?: boolean | null;
    legal_decision?: string | null;
  };
  onComplete?: () => void;
}

export function LegalReviewCard({ incident, onComplete }: LegalReviewCardProps) {
  const { t } = useTranslation();
  const [selectedDecision, setSelectedDecision] = useState<LegalDecision | null>(null);
  const [notes, setNotes] = useState("");

  const { data: canReview, isLoading: checkingPermission } = useCanPerformLegalReview();
  const { mutate: submitReview, isPending } = useLegalReview();

  // Only show for incidents pending legal review
  if (incident.status !== 'pending_legal_review') {
    return null;
  }

  // Check if user can perform review
  if (checkingPermission) {
    return (
      <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-900/10">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    );
  }

  if (!canReview) {
    return (
      <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-300">
            <Scale className="h-5 w-5" />
            {t('workflow.legalReview.pendingTitle', 'Legal/HR Review Required')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('workflow.legalReview.awaitingReview', 'This incident is awaiting legal/HR review before it can proceed.')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = () => {
    if (!selectedDecision) return;
    
    if (selectedDecision === 'blocked' && !notes.trim()) {
      return; // Require notes for blocking
    }

    submitReview({
      incidentId: incident.id,
      decision: selectedDecision,
      notes,
    }, {
      onSuccess: () => {
        onComplete?.();
      },
    });
  };

  const decisionOptions = [
    {
      value: 'approved' as const,
      label: t('workflow.legalReview.approve', 'Approve - Proceed to Department'),
      description: t('workflow.legalReview.approveDesc', 'No legal concerns. Incident can proceed through normal workflow.'),
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      value: 'requires_changes' as const,
      label: t('workflow.legalReview.requiresChanges', 'Return for Changes'),
      description: t('workflow.legalReview.requiresChangesDesc', 'Legal concerns need to be addressed before proceeding.'),
      icon: AlertTriangle,
      color: 'text-amber-600',
    },
    {
      value: 'blocked' as const,
      label: t('workflow.legalReview.block', 'Block - Cannot Proceed'),
      description: t('workflow.legalReview.blockDesc', 'Serious legal concerns prevent this incident from proceeding.'),
      icon: XCircle,
      color: 'text-red-600',
    },
  ];

  return (
    <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-900/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-300">
            <Scale className="h-5 w-5" />
            {t('workflow.legalReview.title', 'Legal/HR Review')}
          </CardTitle>
          <Badge variant="outline" className="border-purple-300 text-purple-700">
            {t('workflow.legalReview.required', 'Review Required')}
          </Badge>
        </div>
        <CardDescription>
          {t('workflow.legalReview.description', 'This incident requires legal/HR review due to its sensitive nature.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="default" className="bg-purple-100/50 border-purple-200">
          <Scale className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-800">
            <strong>{t('workflow.legalReview.triggeredBy', 'Review triggered by')}:</strong>{' '}
            {incident.severity_v2 === 'Level 5' && t('workflow.legalReview.severityCritical', 'Critical severity level')}
            {incident.has_injury && t('workflow.legalReview.injuryReported', 'Injury reported')}
            {incident.event_type === 'security_breach' && t('workflow.legalReview.securityBreach', 'Security breach')}
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Label>{t('workflow.legalReview.decision', 'Your Decision')}</Label>
          <RadioGroup
            value={selectedDecision || ''}
            onValueChange={(v) => setSelectedDecision(v as LegalDecision)}
            className="space-y-3"
          >
            {decisionOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedDecision === option.value
                      ? 'border-purple-400 bg-purple-100/50 dark:bg-purple-900/20'
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
          <Label htmlFor="legal-notes">
            {t('workflow.legalReview.notes', 'Review Notes')}
            {selectedDecision === 'blocked' && <span className="text-destructive ms-1">*</span>}
          </Label>
          <Textarea
            id="legal-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('workflow.legalReview.notesPlaceholder', 'Document your legal review findings and recommendations...')}
            rows={4}
          />
          {selectedDecision === 'blocked' && !notes.trim() && (
            <p className="text-sm text-destructive">
              {t('workflow.legalReview.notesRequired', 'Notes are required when blocking an incident.')}
            </p>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!selectedDecision || isPending || (selectedDecision === 'blocked' && !notes.trim())}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin me-2" />
              {t('common.processing', 'Processing...')}
            </>
          ) : (
            t('workflow.legalReview.submit', 'Submit Legal Review')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
