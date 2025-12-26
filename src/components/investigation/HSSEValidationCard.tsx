/**
 * HSSE Validation Card
 * 
 * Displayed to HSSE Experts for observations at Levels 3-4
 * Allows expert to accept or reject the risk assessment and actions
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useHSSEValidation, useCanPerformHSSEValidation } from '@/hooks/use-hsse-validation';
import { getSeverityConfig, type SeverityLevelV2 } from '@/lib/hsse-severity-levels';
import type { IncidentWithDetails } from '@/hooks/use-incidents';

interface HSSEValidationCardProps {
  incident: IncidentWithDetails;
  onComplete?: () => void;
}

export function HSSEValidationCard({ incident, onComplete }: HSSEValidationCardProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const [selectedDecision, setSelectedDecision] = useState<'accept' | 'reject' | null>(null);
  
  const { data: canValidate, isLoading: checkingPermission } = useCanPerformHSSEValidation();
  const validation = useHSSEValidation();
  
  const severity = (incident as any).severity_v2 as SeverityLevelV2;
  const severityConfig = getSeverityConfig(severity);
  const incidentStatus = incident.status as string;
  
  // Only show for observations pending HSSE validation
  if (incident.event_type !== 'observation' || incidentStatus !== 'pending_hsse_validation') {
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
  
  return (
    <Card className="border-2 border-primary/50 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t('workflow.hsseValidation.title')}</CardTitle>
        </div>
        <CardDescription>
          {t('workflow.hsseValidation.description')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Severity indicator */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('severity.ratingLabel')}:</span>
          <Badge className={severityConfig?.bgColor}>
            {t(`severity.${severity}.label`)}
          </Badge>
        </div>
        
        {/* Info alert */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {severityConfig?.requiresManagerClosure 
              ? t('workflow.hsseValidation.level5Warning')
              : t('workflow.hsseValidation.level34Info')}
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
            {t('workflow.hsseValidation.acceptRisk')}
          </Button>
          <Button
            variant={selectedDecision === 'reject' ? 'destructive' : 'outline'}
            className="flex-1 gap-2"
            onClick={() => setSelectedDecision('reject')}
          >
            <XCircle className="h-4 w-4" />
            {t('workflow.hsseValidation.rejectRisk')}
          </Button>
        </div>
        
        {/* Notes field */}
        {selectedDecision && (
          <div className="space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={selectedDecision === 'reject' 
                ? t('workflow.hsseValidation.rejectionNotesPlaceholder')
                : t('workflow.hsseValidation.notesPlaceholder')}
              rows={3}
            />
            {selectedDecision === 'reject' && !notes.trim() && (
              <p className="text-sm text-destructive">
                {t('workflow.hsseValidation.rejectionNotesRequired')}
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
                {t('common.processing')}
              </>
            ) : (
              t('workflow.hsseValidation.submitDecision')
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
