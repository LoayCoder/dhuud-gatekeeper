/**
 * HSSE Validation Card
 * 
 * Displayed to HSSE Experts for observations at Levels 3+
 * Allows expert to accept, reject, or enforce a final decision
 * Handles observations from both contractor and normal paths
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  AlertTriangle, 
  Loader2,
  ShieldAlert,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useHSSEValidation, useCanPerformHSSEValidation } from '@/hooks/use-hsse-validation';
import { useHSSEEnforceDecision, useIsObservationEnforced } from '@/hooks/use-hsse-enforcement';
import { getSeverityConfig, type SeverityLevelV2 } from '@/lib/hsse-severity-levels';
import type { IncidentWithDetails } from '@/hooks/use-incidents';

interface HSSEValidationCardProps {
  incident: IncidentWithDetails;
  onComplete?: () => void;
}

export function HSSEValidationCard({ incident, onComplete }: HSSEValidationCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [notes, setNotes] = useState('');
  const [selectedDecision, setSelectedDecision] = useState<'accept' | 'reject' | null>(null);
  const [showEnforceDialog, setShowEnforceDialog] = useState(false);
  const [enforceNotes, setEnforceNotes] = useState('');
  
  const { data: canValidate, isLoading: checkingPermission } = useCanPerformHSSEValidation();
  const { data: isEnforced } = useIsObservationEnforced(incident.id);
  const validation = useHSSEValidation();
  const enforcement = useHSSEEnforceDecision();
  
  const severity = (incident as any).severity_v2 as SeverityLevelV2;
  const severityConfig = getSeverityConfig(severity);
  const incidentStatus = incident.status as string;
  
  // Check if this came from contractor path or normal path
  const isContractorObservation = !!incident.related_contractor_company_id;
  
  // Show for multiple HSSE review statuses
  const validStatuses = [
    'pending_hsse_validation',
    'pending_hsse_expert_review',
    'pending_action_dispute_review' // When escalated from action dispute
  ];
  
  if (incident.event_type !== 'observation' || !validStatuses.includes(incidentStatus)) {
    return null;
  }
  
  // If already enforced, don't show action card
  if (isEnforced) {
    return null;
  }
  
  // Only show if user can validate
  if (checkingPermission || !canValidate) {
    return null;
  }
  
  const handleDecision = async (decision: 'accept' | 'reject') => {
    if (decision === 'reject' && !notes.trim()) {
      return; // Require notes for rejection
    }
    
    await validation.mutateAsync({
      incidentId: incident.id,
      decision,
      notes: notes.trim() || undefined,
    });
    
    onComplete?.();
  };
  
  const handleEnforce = async () => {
    if (!enforceNotes.trim() || !selectedDecision) return;
    
    // Map UI decision to enforcement decision type
    const enforcementDecision = selectedDecision === 'accept' ? 'approve' : 'reject';
    
    await enforcement.mutateAsync({
      incidentId: incident.id,
      decision: enforcementDecision as 'approve' | 'reject',
      notes: enforceNotes.trim()
    });
    
    setShowEnforceDialog(false);
    onComplete?.();
  };
  
  return (
    <>
      <Card className="border-2 border-primary/50 shadow-md" dir={direction}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t('workflow.hsseValidation.title', 'HSSE Expert Review')}</CardTitle>
            </div>
            <Badge variant="outline" className="bg-primary/10">
              {isContractorObservation 
                ? t('workflow.hsseValidation.contractorPath', 'Contractor Observation')
                : t('workflow.hsseValidation.normalPath', 'Department Observation')
              }
            </Badge>
          </div>
          <CardDescription>
            {t('workflow.hsseValidation.description', 'Review the observation and make a decision on the risk assessment and corrective actions.')}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Severity indicator */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('severity.ratingLabel', 'Severity')}:</span>
            <Badge className={severityConfig?.bgColor}>
              {t(`severity.${severity}.label`, severity)}
            </Badge>
          </div>
          
          {/* Info alert */}
          <Alert className={severityConfig?.requiresManagerClosure ? 'border-destructive/30' : ''}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {severityConfig?.requiresManagerClosure 
                ? t('workflow.hsseValidation.level5Warning', 'Level 5 observations require HSSE Manager approval for closure.')
                : t('workflow.hsseValidation.level34Info', 'As HSSE Expert, your decision will determine the next steps for this observation.')
              }
            </AlertDescription>
          </Alert>
          
          {/* Decision buttons */}
          <div className="flex gap-2">
            <Button
              variant={selectedDecision === 'accept' ? 'default' : 'outline'}
              className="flex-1 gap-2"
              onClick={() => setSelectedDecision('accept')}
            >
              <CheckCircle2 className="h-4 w-4" />
              {t('workflow.hsseValidation.acceptRisk', 'Accept & Approve')}
            </Button>
            <Button
              variant={selectedDecision === 'reject' ? 'destructive' : 'outline'}
              className="flex-1 gap-2"
              onClick={() => setSelectedDecision('reject')}
            >
              <XCircle className="h-4 w-4" />
              {t('workflow.hsseValidation.rejectRisk', 'Reject & Return')}
            </Button>
          </div>
          
          {/* Notes field */}
          {selectedDecision && (
            <div className="space-y-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={selectedDecision === 'reject' 
                  ? t('workflow.hsseValidation.rejectionNotesPlaceholder', 'Explain why this is being rejected...')
                  : t('workflow.hsseValidation.notesPlaceholder', 'Add any notes for this decision...')}
                rows={3}
              />
              {selectedDecision === 'reject' && !notes.trim() && (
                <p className="text-sm text-destructive">
                  {t('workflow.hsseValidation.rejectionNotesRequired', 'Notes are required for rejection')}
                </p>
              )}
            </div>
          )}
          
          {/* Submit button */}
          {selectedDecision && (
            <Button
              className="w-full"
              disabled={validation.isPending || (selectedDecision === 'reject' && !notes.trim())}
              onClick={() => handleDecision(selectedDecision)}
            >
              {validation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                  {t('common.processing', 'Processing...')}
                </>
              ) : (
                t('workflow.hsseValidation.submitDecision', 'Submit Decision')
              )}
            </Button>
          )}
          
          {/* Enforce Decision Section */}
          <Separator />
          
          <Alert className="border-destructive/50 bg-destructive/5">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <AlertTitle className="text-destructive">
              {t('workflow.hsseValidation.enforceTitle', 'Final Authority')}
            </AlertTitle>
            <AlertDescription className="text-sm">
              {t('workflow.hsseValidation.enforceDescription', 
                'Use this option to make a final, non-appealable decision. This should only be used when normal workflow resolution is not possible.')}
            </AlertDescription>
          </Alert>
          
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={() => setShowEnforceDialog(true)}
          >
            <Lock className="h-4 w-4" />
            {t('workflow.hsseValidation.enforceDecision', 'Enforce Final Decision')}
          </Button>
        </CardContent>
      </Card>
      
      {/* Enforce Confirmation Dialog */}
      <AlertDialog open={showEnforceDialog} onOpenChange={setShowEnforceDialog}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              {t('workflow.hsseValidation.enforceDialogTitle', 'Enforce Final Decision?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('workflow.hsseValidation.enforceDialogDescription', 
                'This action is irreversible. Once enforced, no further appeals or modifications will be allowed. This decision will be logged for audit purposes.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={selectedDecision === 'accept' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setSelectedDecision('accept')}
              >
                <CheckCircle2 className="h-4 w-4 me-1" />
                {t('common.approve', 'Approve')}
              </Button>
              <Button
                variant={selectedDecision === 'reject' ? 'destructive' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setSelectedDecision('reject')}
              >
                <XCircle className="h-4 w-4 me-1" />
                {t('common.reject', 'Reject')}
              </Button>
            </div>
            
            <Textarea
              value={enforceNotes}
              onChange={(e) => setEnforceNotes(e.target.value)}
              placeholder={t('workflow.hsseValidation.enforceNotesPlaceholder', 'Provide justification for this enforcement (required)...')}
              rows={3}
            />
            {!enforceNotes.trim() && (
              <p className="text-xs text-destructive">
                {t('workflow.hsseValidation.enforceNotesRequired', 'Justification notes are required')}
              </p>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEnforce}
              disabled={!enforceNotes.trim() || !selectedDecision || enforcement.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {enforcement.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t('workflow.hsseValidation.confirmEnforce', 'Enforce Decision')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
