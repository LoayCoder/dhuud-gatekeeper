import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { useConsultantVerifyAction } from '@/hooks/contractor-observation';

interface CompletedAction {
  id: string;
  title: string;
  implementation_notes?: string;
  implementation_evidence?: string[];
  completed_at?: string;
}

interface ConsultantVerificationCardProps {
  incidentId: string;
  status: string;
  completedActions: CompletedAction[];
  onIdentifyViolation?: () => void;
}

export function ConsultantVerificationCard({
  incidentId,
  status,
  completedActions,
  onIdentifyViolation
}: ConsultantVerificationCardProps) {
  const { t } = useTranslation();
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  
  const { mutate: verifyAction, isPending } = useConsultantVerifyAction();

  if (status !== 'pending_consultant_verification') return null;

  const unverifiedActions = completedActions.filter(a => !a.completed_at);

  const handleVerification = (decision: 'accepted' | 'rejected') => {
    if (!selectedAction) return;
    
    verifyAction({
      actionId: selectedAction,
      decision,
      notes: notes.trim() || undefined
    }, {
      onSuccess: () => {
        setSelectedAction(null);
        setNotes('');
      }
    });
  };

  const selectedActionData = completedActions.find(a => a.id === selectedAction);

  return (
    <Card className="border-success/20 bg-success/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5 text-success" />
          {t('workflow.verification', 'Action Verification')}
          <Badge variant="outline" className="ms-auto">
            {unverifiedActions.length} {t('workflow.pending', 'Pending')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('workflow.completedActions', 'Completed Actions')}
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {completedActions.map(action => (
              <div
                key={action.id}
                onClick={() => setSelectedAction(action.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedAction === action.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{action.title}</span>
                  {action.implementation_evidence && action.implementation_evidence.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {action.implementation_evidence.length} {t('workflow.files', 'files')}
                    </Badge>
                  )}
                </div>
                {action.implementation_notes && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {action.implementation_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {selectedActionData && (
          <>
            {selectedActionData.implementation_evidence && 
             selectedActionData.implementation_evidence.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('workflow.evidence', 'Evidence')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedActionData.implementation_evidence.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {t('workflow.viewFile', 'View File')} {index + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('workflow.verificationNotes', 'Verification Notes')}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('workflow.verificationNotesPlaceholder', 'Enter verification findings...')}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="destructive"
                onClick={() => handleVerification('rejected')}
                disabled={isPending}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                {t('workflow.rejectAction', 'Reject')}
              </Button>

              <Button
                variant="default"
                onClick={() => handleVerification('accepted')}
                disabled={isPending}
                className="gap-2 bg-success hover:bg-success/90"
              >
                <CheckCircle className="h-4 w-4" />
                {t('workflow.acceptAction', 'Accept')}
              </Button>
            </div>
          </>
        )}

        {onIdentifyViolation && (
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              onClick={onIdentifyViolation}
              className="w-full gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <AlertTriangle className="h-4 w-4" />
              {t('workflow.identifyViolation', 'Identify Violation')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
