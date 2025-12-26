/**
 * Observation Closure Gate Component
 * 
 * Controls observation closure based on severity level:
 * - Level 5 (Catastrophic): Only HSSE Manager can close
 * - Levels 3-4: Auto-closes when all actions verified + HSSE validation accepted
 * - Levels 1-2: Can close on spot
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Shield, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useManagerFinalClosure, useCanPerformFinalClosure } from '@/hooks/use-hsse-validation';
import { getSeverityConfig, type SeverityLevelV2 } from '@/lib/hsse-severity-levels';
import type { IncidentWithDetails } from '@/hooks/use-incidents';

interface ObservationClosureGateProps {
  incident: IncidentWithDetails;
  onComplete?: () => void;
}

export function ObservationClosureGate({ incident, onComplete }: ObservationClosureGateProps) {
  const { t } = useTranslation();
  const [justification, setJustification] = useState('');
  
  const { data: canClose, isLoading: checkingPermission } = useCanPerformFinalClosure();
  const finalClosure = useManagerFinalClosure();
  
  const severity = (incident as any).severity_v2 as SeverityLevelV2;
  const severityConfig = getSeverityConfig(severity);
  const incidentStatus = incident.status as string;
  
  // Only show for observations pending final closure
  if (incident.event_type !== 'observation' || incidentStatus !== 'pending_final_closure') {
    return null;
  }
  
  // Show locked state for non-managers
  if (checkingPermission) {
    return (
      <Card className="border-2 border-muted">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  
  if (!canClose) {
    return (
      <Card className="border-2 border-yellow-500/50 bg-yellow-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-lg">{t('workflow.closureGate.lockedTitle')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertTitle>{t('workflow.closureGate.level5LockedTitle')}</AlertTitle>
            <AlertDescription>
              {t('workflow.closureGate.level5LockedDescription')}
            </AlertDescription>
          </Alert>
          
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('severity.ratingLabel')}:</span>
            <Badge className={severityConfig?.bgColor}>
              {t(`severity.${severity}.label`)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const handleClose = async () => {
    if (!justification.trim()) return;
    
    await finalClosure.mutateAsync({
      incidentId: incident.id,
      justification: justification.trim(),
    });
    
    onComplete?.();
  };
  
  return (
    <Card className="border-2 border-red-500/50 bg-red-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-600" />
          <CardTitle className="text-lg">{t('workflow.closureGate.managerClosureTitle')}</CardTitle>
        </div>
        <CardDescription>
          {t('workflow.closureGate.managerClosureDescription')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Severity indicator */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('severity.ratingLabel')}:</span>
          <Badge className={severityConfig?.bgColor}>
            {t(`severity.${severity}.label`)}
          </Badge>
          <Badge variant="destructive" className="ms-auto">
            {t('workflow.closureGate.catastrophicLevel')}
          </Badge>
        </div>
        
        {/* Warning alert */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('workflow.closureGate.level5WarningTitle')}</AlertTitle>
          <AlertDescription>
            {t('workflow.closureGate.level5WarningDescription')}
          </AlertDescription>
        </Alert>
        
        {/* Justification */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('workflow.closureGate.justificationLabel')}
          </label>
          <Textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder={t('workflow.closureGate.justificationPlaceholder')}
            rows={4}
          />
          {!justification.trim() && (
            <p className="text-sm text-muted-foreground">
              {t('workflow.closureGate.justificationRequired')}
            </p>
          )}
        </div>
        
        {/* Close button */}
        <Button
          className="w-full gap-2"
          variant="destructive"
          disabled={finalClosure.isPending || !justification.trim()}
          onClick={handleClose}
        >
          {finalClosure.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.processing')}
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              {t('workflow.closureGate.finalizeAndClose')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
