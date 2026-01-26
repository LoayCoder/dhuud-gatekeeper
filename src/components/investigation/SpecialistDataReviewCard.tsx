import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Loader2,
  AlertTriangle,
  FileCheck,
  HeartPulse,
  Wrench,
  Leaf,
} from "lucide-react";
import { useSpecialistReview, type SpecialistDataType, type ReviewStatus } from "@/hooks/use-specialist-review";
import { useUserRoles } from "@/hooks/use-user-roles";

interface SpecialistDataReviewCardProps {
  incidentId: string;
  dataType: SpecialistDataType;
  /** Whether current user is the assigned specialist who can submit */
  canSubmit?: boolean;
  /** Whether current user is a reviewer who can approve/return */
  canReview?: boolean;
}

const DATA_TYPE_CONFIG: Record<SpecialistDataType, { icon: React.ElementType; color: string; bgColor: string }> = {
  injury: { icon: HeartPulse, color: 'text-red-600', bgColor: 'border-red-500/50 bg-red-500/5' },
  property_damage: { icon: Wrench, color: 'text-amber-600', bgColor: 'border-amber-500/50 bg-amber-500/5' },
  environmental: { icon: Leaf, color: 'text-green-600', bgColor: 'border-green-500/50 bg-green-500/5' },
};

const STATUS_CONFIG: Record<ReviewStatus, { icon: React.ElementType; variant: 'default' | 'outline' | 'secondary' | 'destructive'; className: string }> = {
  draft: { icon: Clock, variant: 'outline', className: 'bg-gray-100 text-gray-800 border-gray-300' },
  submitted: { icon: Send, variant: 'outline', className: 'bg-blue-100 text-blue-800 border-blue-300' },
  approved: { icon: CheckCircle2, variant: 'outline', className: 'bg-green-100 text-green-800 border-green-300' },
  returned: { icon: RotateCcw, variant: 'outline', className: 'bg-amber-100 text-amber-800 border-amber-300' },
};

export function SpecialistDataReviewCard({
  incidentId,
  dataType,
  canSubmit = false,
  canReview = false,
}: SpecialistDataReviewCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnNotes, setReturnNotes] = useState("");

  const {
    status,
    recordCount,
    isLoading,
    isDraft,
    isSubmitted,
    isApproved,
    isReturned,
    returnNotes: existingReturnNotes,
    submitForReview,
    approveReview,
    returnForCorrections,
    isSubmitting,
    isApproving,
    isReturning,
  } = useSpecialistReview(incidentId, dataType);

  const config = DATA_TYPE_CONFIG[dataType];
  const Icon = config.icon;

  // Don't show if no records and not a reviewer
  if (!isLoading && recordCount === 0 && !canReview) {
    return null;
  }

  // Don't show if neither can submit nor review
  if (!canSubmit && !canReview) {
    return null;
  }

  const getDataTypeLabel = () => {
    switch (dataType) {
      case 'injury':
        return t('investigation.review.injuryData', 'Injury Assessment');
      case 'property_damage':
        return t('investigation.review.propertyDamageData', 'Property Damage Assessment');
      case 'environmental':
        return t('investigation.review.environmentalData', 'Environmental Impact Assessment');
    }
  };

  const getStatusLabel = (s: ReviewStatus) => {
    switch (s) {
      case 'draft':
        return t('investigation.review.statusDraft', 'Draft');
      case 'submitted':
        return t('investigation.review.statusSubmitted', 'Awaiting Review');
      case 'approved':
        return t('investigation.review.statusApproved', 'Approved');
      case 'returned':
        return t('investigation.review.statusReturned', 'Needs Corrections');
    }
  };

  const handleSubmit = () => {
    (submitForReview as any)();
  };

  const handleApprove = () => {
    approveReview();
  };

  const handleReturn = () => {
    if (returnNotes.trim()) {
      returnForCorrections(returnNotes.trim());
      setShowReturnDialog(false);
      setReturnNotes("");
    }
  };

  if (isLoading) {
    return (
      <Card className={config.bgColor} dir={direction}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className={`h-6 w-6 animate-spin ${config.color}`} />
        </CardContent>
      </Card>
    );
  }

  const statusConfig = status ? STATUS_CONFIG[status] : null;
  const StatusIcon = statusConfig?.icon || Clock;

  return (
    <>
      <Card className={config.bgColor} dir={direction}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${config.color}`} />
              <CardTitle className="text-lg">
                {getDataTypeLabel()} {t('investigation.review.title', 'Review')}
              </CardTitle>
            </div>
            {status && (
              <Badge variant={statusConfig?.variant} className={statusConfig?.className}>
                <StatusIcon className="h-3 w-3 me-1" />
                {getStatusLabel(status)}
              </Badge>
            )}
          </div>
          <CardDescription>
            {recordCount} {t('investigation.review.recordsCount', 'record(s) documented')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Return Notes Alert */}
          {isReturned && existingReturnNotes && (
            <Alert variant="destructive" className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('investigation.review.correctionsRequired', 'Corrections Required')}</AlertTitle>
              <AlertDescription className="mt-2">
                {existingReturnNotes}
              </AlertDescription>
            </Alert>
          )}

          {/* Specialist Actions - Submit for Review */}
          {canSubmit && (isDraft || isReturned) && recordCount > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {isReturned
                  ? t('investigation.review.resubmitDesc', 'After making corrections, submit your assessment for review again.')
                  : t('investigation.review.submitDesc', 'Once all data is documented, submit for leader review.')
                }
              </p>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 me-2" />
                )}
                {t('investigation.review.submitForReview', 'Submit for Review')}
              </Button>
            </div>
          )}

          {/* Waiting for Review Status */}
          {canSubmit && isSubmitted && (
            <div className="text-center py-4 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('investigation.review.awaitingReview', 'Your assessment is awaiting review by the investigation lead.')}</p>
            </div>
          )}

          {/* Approved Status */}
          {isApproved && (
            <div className="text-center py-4 text-green-600">
              <FileCheck className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">{t('investigation.review.assessmentApproved', 'Assessment has been approved')}</p>
            </div>
          )}

          {/* Reviewer Actions */}
          {canReview && isSubmitted && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('investigation.review.reviewDesc', 'Review the specialist assessment and approve or return for corrections.')}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleApprove}
                  disabled={isApproving || isReturning}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 me-2" />
                  )}
                  {t('investigation.review.approve', 'Approve')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowReturnDialog(true)}
                  disabled={isApproving || isReturning}
                  className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <RotateCcw className="h-4 w-4 me-2" />
                  {t('investigation.review.returnForCorrections', 'Return')}
                </Button>
              </div>
            </div>
          )}

          {/* No Records Info */}
          {recordCount === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <p>{t('investigation.review.noRecords', 'No assessment records have been documented yet.')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Return for Corrections Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('investigation.review.returnDialogTitle', 'Return for Corrections')}
            </DialogTitle>
            <DialogDescription>
              {t('investigation.review.returnDialogDesc', 'Please provide feedback on what needs to be corrected.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder={t('investigation.review.returnNotesPlaceholder', 'Describe what needs to be corrected...')}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleReturn}
              disabled={!returnNotes.trim() || isReturning}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isReturning ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 me-2" />
              )}
              {t('investigation.review.return', 'Return for Corrections')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
