/**
 * HSSE Incident Validation Card
 * 
 * Displayed for HSSE users when an incident is awaiting final validation before closure.
 * Shows prerequisites status and allows approve, reject, or request investigation review.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, CheckCircle2, XCircle, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  useHSSEValidateIncident, 
  useCanValidateIncident, 
  useIncidentClosurePrerequisites 
} from '@/hooks/use-hsse-incident-validation';
import type { IncidentWithDetails } from '@/hooks/use-incidents';
import { cn } from '@/lib/utils';

interface HSSEIncidentValidationCardProps {
  incident: IncidentWithDetails;
  onComplete?: () => void;
}

type Decision = 'approve' | 'reject' | 'request_investigation_review';

export function HSSEIncidentValidationCard({ incident, onComplete }: HSSEIncidentValidationCardProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  
  const { data: canValidate, isLoading: checkingPermission } = useCanValidateIncident();
  const { data: prerequisites } = useIncidentClosurePrerequisites(incident.id);
  const validateMutation = useHSSEValidateIncident();
  
  // Only show for incidents awaiting HSSE validation
  const validStatuses = ['pending_final_closure', 'pending_hsse_incident_validation'];
  if (!validStatuses.includes(incident.status as string)) {
    return null;
  }
  
  // Only show if user can validate
  if (checkingPermission || !canValidate) {
    return null;
  }
  
  const handleDecision = async () => {
    if (!selectedDecision) return;
    
    // Require notes for reject and review request
    if ((selectedDecision === 'reject' || selectedDecision === 'request_investigation_review') && !notes.trim()) {
      return;
    }
    
    await validateMutation.mutateAsync({
      incidentId: incident.id,
      decision: selectedDecision,
      notes: notes.trim() || undefined,
    });
    
    setSelectedDecision(null);
    setNotes('');
    onComplete?.();
  };
  
  const allPrerequisitesMet = prerequisites?.ready_for_closure === true;
  
  return (
    <Card className="border-2 border-primary/50 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              {t('investigation.hsseIncidentValidation.title', 'HSSE Incident Validation')}
            </CardTitle>
          </div>
          <Badge variant={allPrerequisitesMet ? "default" : "secondary"}>
            {allPrerequisitesMet 
              ? t('investigation.hsseIncidentValidation.ready', 'Ready for Closure')
              : t('investigation.hsseIncidentValidation.pendingPrerequisites', 'Prerequisites Pending')}
          </Badge>
        </div>
        <CardDescription>
          {t('investigation.hsseIncidentValidation.description', 
            'Review the investigation and approve for final closure, or request additional review.')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Prerequisites Summary */}
        {prerequisites && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(prerequisites.checks || {}).slice(0, 6).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                {value ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={cn("text-xs", value ? "text-foreground" : "text-muted-foreground")}>
                  {t(`investigation.prerequisites.${key}`, key.replace(/_/g, ' '))}
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* Warning if prerequisites not met */}
        {!allPrerequisitesMet && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('investigation.hsseIncidentValidation.prerequisitesWarning', 
                'Some prerequisites are not met. You can still reject or request investigation review.')}
            </AlertDescription>
          </Alert>
        )}
        
        <Separator />
        
        {/* Decision Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={selectedDecision === 'approve' ? 'default' : 'outline'}
            className={cn("gap-2", selectedDecision === 'approve' && "bg-success hover:bg-success/90")}
            onClick={() => setSelectedDecision('approve')}
            disabled={!allPrerequisitesMet}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.approve', 'Approve')}</span>
          </Button>
          
          <Button
            variant={selectedDecision === 'reject' ? 'destructive' : 'outline'}
            className="gap-2"
            onClick={() => setSelectedDecision('reject')}
          >
            <XCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.reject', 'Reject')}</span>
          </Button>
          
          <Button
            variant={selectedDecision === 'request_investigation_review' ? 'secondary' : 'outline'}
            className="gap-2"
            onClick={() => setSelectedDecision('request_investigation_review')}
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">{t('investigation.hsseIncidentValidation.requestReview', 'Review')}</span>
          </Button>
        </div>
        
        {/* Notes Input */}
        {selectedDecision && (
          <div className="space-y-2">
            <Label htmlFor="validation-notes">
              {t('investigation.hsseIncidentValidation.notesLabel', 'Notes')}
              {(selectedDecision === 'reject' || selectedDecision === 'request_investigation_review') && (
                <span className="text-destructive ms-1">*</span>
              )}
            </Label>
            <Textarea
              id="validation-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                selectedDecision === 'approve'
                  ? t('investigation.hsseIncidentValidation.approveNotesPlaceholder', 'Optional approval notes...')
                  : selectedDecision === 'reject'
                  ? t('investigation.hsseIncidentValidation.rejectNotesPlaceholder', 'Explain why this incident cannot be closed...')
                  : t('investigation.hsseIncidentValidation.reviewNotesPlaceholder', 'Explain what needs to be reviewed in the investigation...')
              }
              rows={3}
            />
          </div>
        )}
        
        {/* Submit Button */}
        {selectedDecision && (
          <Button
            onClick={handleDecision}
            disabled={
              validateMutation.isPending || 
              ((selectedDecision === 'reject' || selectedDecision === 'request_investigation_review') && !notes.trim())
            }
            className={cn(
              "w-full gap-2",
              selectedDecision === 'approve' && "bg-success hover:bg-success/90",
              selectedDecision === 'reject' && "bg-destructive hover:bg-destructive/90"
            )}
          >
            {validateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {selectedDecision === 'approve' && (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {t('investigation.hsseIncidentValidation.approveAndClose', 'Approve & Close Incident')}
              </>
            )}
            {selectedDecision === 'reject' && (
              <>
                <XCircle className="h-4 w-4" />
                {t('investigation.hsseIncidentValidation.rejectValidation', 'Reject Validation')}
              </>
            )}
            {selectedDecision === 'request_investigation_review' && (
              <>
                <RotateCcw className="h-4 w-4" />
                {t('investigation.hsseIncidentValidation.sendForReview', 'Request Investigation Review')}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
