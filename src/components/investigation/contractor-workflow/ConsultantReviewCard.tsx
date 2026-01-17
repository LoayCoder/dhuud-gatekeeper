import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  UserCheck, 
  ClipboardList, 
  Send, 
  AlertTriangle, 
  ArrowUpRight,
  Loader2,
  Info
} from 'lucide-react';
import { useConsultantCompleteScreening, useCanReviewAsConsultant } from '@/hooks/use-consultant-workflow';
import { getSeverityConfig, type SeverityLevelV2 } from '@/lib/hsse-severity-levels';

interface ConsultantReviewCardProps {
  incidentId: string;
  status: string;
  severityLevel?: SeverityLevelV2;
  consultantNotes?: string;
  hasActions?: boolean;
  actionsCount?: number;
  onActionCreated?: () => void;
  onComplete?: () => void;
}

export function ConsultantReviewCard({
  incidentId,
  status,
  severityLevel,
  consultantNotes,
  hasActions = false,
  actionsCount = 0,
  onActionCreated,
  onComplete
}: ConsultantReviewCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [notes, setNotes] = useState(consultantNotes || '');
  
  const { mutate: completeScreening, isPending } = useConsultantCompleteScreening();
  
  // Permission check - only show to users with contractor consultant role
  const { data: canReview, isLoading: checkingPermission } = useCanReviewAsConsultant(incidentId);

  // Show for consultant screening stage
  const isScreeningStage = status === 'pending_consultant_screening' || 
                           status === 'pending_consultant_review' || 
                           status === 'pending_consultant_actions';
  
  // Don't render if not in screening stage
  if (!isScreeningStage) return null;
  
  // Show loading skeleton while checking permission
  if (checkingPermission) {
    return (
      <Card className="border-primary/20 bg-primary/5" dir={direction}>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  // Don't render if user doesn't have permission
  if (!canReview) return null;

  // Severity-based routing logic
  const isHighSeverity = severityLevel === 'level_3' || 
                         severityLevel === 'level_4' || 
                         severityLevel === 'level_5';
  
  const severityConfig = severityLevel ? getSeverityConfig(severityLevel) : null;
  
  // Validation
  const canSubmit = actionsCount >= 1 && notes.trim().length > 0;

  const handleSubmit = () => {
    completeScreening({
      incidentId,
      notes: notes.trim() || undefined
    }, {
      onSuccess: onComplete
    });
  };

  const getStatusBadge = () => {
    if (status === 'pending_consultant_screening') {
      return t('workflow.consultant.screening', 'Initial Screening');
    }
    if (status === 'pending_consultant_review') {
      return t('workflow.pendingReview', 'Pending Review');
    }
    return t('workflow.creatingActions', 'Creating Actions');
  };

  return (
    <Card className="border-primary/20 bg-primary/5" dir={direction}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              {t('workflow.consultantReview', 'Consultant Review')}
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-primary/10">
            {getStatusBadge()}
          </Badge>
        </div>
        <CardDescription>
          {t('workflow.consultant.description', 'Review the observation, confirm contractor involvement, and assign corrective actions.')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Severity Indicator */}
        {severityConfig && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('severity.level', 'Severity')}:</span>
            <Badge className={severityConfig.bgColor}>
              {t(`severity.${severityLevel}.label`, severityLevel)}
            </Badge>
            {isHighSeverity && (
              <Badge variant="outline" className="ms-auto text-warning border-warning/30">
                <ArrowUpRight className="h-3 w-3 me-1" />
                {t('workflow.consultant.requiresHSSE', 'Requires HSSE Review')}
              </Badge>
            )}
          </div>
        )}

        {/* Routing Info Alert */}
        <Alert className={isHighSeverity ? 'border-warning/30 bg-warning/5' : 'border-info/30 bg-info/5'}>
          {isHighSeverity ? (
            <AlertTriangle className="h-4 w-4 text-warning" />
          ) : (
            <Info className="h-4 w-4 text-info" />
          )}
          <AlertDescription>
            {isHighSeverity 
              ? t('workflow.consultant.highSeverityInfo', 
                  'This is a Level 3+ observation. After your review, it will be escalated to HSSE Expert for approval before going to Site Client.')
              : t('workflow.consultant.lowSeverityInfo', 
                  'This is a Level 1-2 observation. After your review, it will go directly to Site Client for approval.')
            }
          </AlertDescription>
        </Alert>

        {/* Instructions */}
        <div className="rounded-lg border border-muted bg-muted/30 p-3">
          <p className="text-sm text-muted-foreground">
            {t('workflow.consultantInstructions', 
              'Review the observation details and create required corrective actions. Once all actions are defined, submit for approval.')}
          </p>
        </div>

        {/* Action Count Indicator */}
        <div className={`rounded-lg p-3 flex items-center gap-2 ${
          actionsCount >= 1
            ? 'bg-success/10 border border-success/30 text-success' 
            : 'bg-warning/10 border border-warning/30 text-warning'
        }`}>
          <ClipboardList className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">
            {actionsCount === 0 
              ? t('workflow.noActionsWarning', 'Create at least one corrective action before submitting')
              : t('workflow.actionsCount', '{{count}} corrective action(s) added', { count: actionsCount })
            }
          </span>
        </div>

        {/* Review Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('workflow.reviewNotes', 'Review Notes')} *
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('workflow.reviewNotesPlaceholder', 'Enter your review findings and notes...')}
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onActionCreated}
            className="flex-1 gap-2"
          >
            <ClipboardList className="h-4 w-4" />
            {t('workflow.createAction', 'Create Action')}
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            className="flex-1 gap-2"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isHighSeverity ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isHighSeverity 
              ? t('workflow.consultant.submitToHSSE', 'Submit to HSSE Expert')
              : t('workflow.submitForApproval', 'Submit for Approval')
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
