/**
 * HSSE Observation Validation Card
 * 
 * Displayed to HSSE Experts/Managers when an observation is pending final validation
 * before closure. This is the enhanced version that uses the database function.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShieldCheck, CheckCircle2, XCircle, RotateCcw, 
  Loader2, AlertTriangle, FileCheck, ClipboardCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCanPerformHSSEValidation } from '@/hooks/use-hsse-validation';
import type { IncidentWithDetails } from '@/hooks/use-incidents';
import { cn } from '@/lib/utils';

interface HSSEObservationValidationCardProps {
  incident: IncidentWithDetails;
  onComplete?: () => void;
}

export function HSSEObservationValidationCard({ incident, onComplete }: HSSEObservationValidationCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [notes, setNotes] = useState('');
  const [selectedDecision, setSelectedDecision] = useState<'approve' | 'reject' | 'request_changes' | null>(null);
  
  const { data: canValidate, isLoading: checkingPermission } = useCanPerformHSSEValidation();
  
  // Check if there are pending corrective actions
  const { data: pendingActionsCount } = useQuery({
    queryKey: ['pending-actions-count', incident.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('corrective_actions')
        .select('id', { count: 'exact', head: true })
        .eq('incident_id', incident.id)
        .not('status', 'in', '("completed","verified","cancelled")')
        .is('deleted_at', null);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!incident.id,
  });
  
  // Mutation to call the database function
  const validation = useMutation({
    mutationFn: async (decision: 'approve' | 'reject' | 'request_changes') => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.rpc('hsse_validate_observation_closure', {
        p_incident_id: incident.id,
        p_user_id: user.id,
        p_decision: decision,
        p_notes: notes.trim() || null,
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; decision?: string; new_status?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Validation failed');
      }
      
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident', incident.id] });
      
      toast({
        title: result.decision === 'approve' 
          ? t('validation.approvedTitle', 'Observation Closed')
          : result.decision === 'reject'
            ? t('validation.rejectedTitle', 'Validation Rejected')
            : t('validation.changesRequestedTitle', 'Changes Requested'),
        description: result.decision === 'approve'
          ? t('validation.approvedDesc', 'The observation has been validated and closed.')
          : t('validation.returnedDesc', 'The observation has been returned for correction.'),
      });
      
      onComplete?.();
    },
    onError: (error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const incidentStatus = incident.status as string;
  
  // Only show for observations pending HSSE validation
  if (incident.event_type !== 'observation' || incidentStatus !== 'pending_hsse_validation') {
    return null;
  }
  
  // Only show if user can validate
  if (checkingPermission || !canValidate) {
    return null;
  }
  
  const hasPendingActions = (pendingActionsCount ?? 0) > 0;
  
  const handleDecision = async () => {
    if (!selectedDecision) return;
    if (selectedDecision === 'reject' && !notes.trim()) return;
    
    await validation.mutateAsync(selectedDecision);
  };
  
  return (
    <Card className="border-2 border-primary/50 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">
            {t('validation.title', 'HSSE Observation Validation')}
          </CardTitle>
        </div>
        <CardDescription>
          {t('validation.description', 'Review the observation and corrective actions before final closure.')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Validation Checklist */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t('validation.checklist', 'Validation Checklist')}
          </h4>
          <div className="space-y-1.5">
            <ChecklistItem 
              checked={true} 
              label={t('validation.violationFinalized', 'Violation type assigned')}
            />
            <ChecklistItem 
              checked={!hasPendingActions} 
              label={t('validation.actionsCompleted', 'All corrective actions completed')}
              warning={hasPendingActions}
              warningText={t('validation.pendingActionsWarning', '{{count}} actions pending', { count: pendingActionsCount })}
            />
            <ChecklistItem 
              checked={true} 
              label={t('validation.evidenceDocumented', 'Evidence documented')}
            />
          </div>
        </div>
        
        <Separator />
        
        {/* Warning if pending actions */}
        {hasPendingActions && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t('validation.cannotApproveWithPending', 
                'Cannot approve closure while corrective actions are pending. You can reject or request changes.'
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Decision buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedDecision === 'approve' ? 'default' : 'outline'}
            className="flex-1 gap-2"
            onClick={() => setSelectedDecision('approve')}
            disabled={hasPendingActions}
          >
            <CheckCircle2 className="h-4 w-4" />
            {t('validation.approveClose', 'Approve & Close')}
          </Button>
          <Button
            variant={selectedDecision === 'request_changes' ? 'secondary' : 'outline'}
            className="flex-1 gap-2"
            onClick={() => setSelectedDecision('request_changes')}
          >
            <RotateCcw className="h-4 w-4" />
            {t('validation.requestChanges', 'Request Changes')}
          </Button>
          <Button
            variant={selectedDecision === 'reject' ? 'destructive' : 'outline'}
            className="flex-1 gap-2"
            onClick={() => setSelectedDecision('reject')}
          >
            <XCircle className="h-4 w-4" />
            {t('validation.reject', 'Reject')}
          </Button>
        </div>
        
        {/* Notes field */}
        {selectedDecision && (
          <div className="space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                selectedDecision === 'reject' 
                  ? t('validation.rejectionNotesPlaceholder', 'Explain why this observation is being rejected...')
                  : selectedDecision === 'request_changes'
                    ? t('validation.changesNotesPlaceholder', 'Describe what changes are needed...')
                    : t('validation.approvalNotesPlaceholder', 'Optional notes for approval...')
              }
              rows={3}
            />
            {selectedDecision === 'reject' && !notes.trim() && (
              <p className="text-sm text-destructive">
                {t('validation.notesRequired', 'Notes are required for rejection')}
              </p>
            )}
          </div>
        )}
        
        {/* Submit button */}
        {selectedDecision && (
          <Button
            className="w-full"
            disabled={
              validation.isPending || 
              (selectedDecision === 'reject' && !notes.trim()) ||
              (selectedDecision === 'approve' && hasPendingActions)
            }
            onClick={handleDecision}
          >
            {validation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin me-2" />
                {t('common.processing', 'Processing...')}
              </>
            ) : (
              t('validation.submitDecision', 'Submit Decision')
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ChecklistItem({ 
  checked, 
  label, 
  warning, 
  warningText 
}: { 
  checked: boolean; 
  label: string; 
  warning?: boolean;
  warningText?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={cn(
        'h-4 w-4 rounded-full flex items-center justify-center',
        checked && !warning ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
      )}>
        {checked && !warning ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : (
          <AlertTriangle className="h-3 w-3" />
        )}
      </div>
      <span className={cn(!checked && 'text-muted-foreground')}>
        {label}
      </span>
      {warning && warningText && (
        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
          {warningText}
        </Badge>
      )}
    </div>
  );
}
