import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Loader2, Clock, CheckCircle, XCircle, Lock, Info, TrendingUp } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useInvestigationEditAccess } from "@/hooks/use-investigation-edit-access";
import type { IncidentWithDetails } from "@/hooks/use-incidents";
import type { Investigation } from "@/hooks/use-investigation";
import type { Database } from "@/integrations/supabase/types";
import { 
  HSSE_SEVERITY_LEVELS, 
  type SeverityLevelV2, 
  calculateMinimumSeverity, 
  isSeverityBelowMinimum,
  getSeverityConfig,
  mapOldSeverityToNew 
} from "@/lib/hsse-severity-levels";

type SeverityLevel = Database['public']['Enums']['severity_level'];

interface SeverityAdjustmentCardProps {
  incident: IncidentWithDetails;
  investigation?: Investigation | null;
  onRefresh: () => void;
}

// Helper to send notification email
async function sendSeverityNotification(payload: {
  type: 'severity_proposed' | 'severity_approved' | 'severity_rejected' | 'potential_severity_proposed' | 'potential_severity_approved' | 'potential_severity_rejected';
  incident_id: string;
  incident_title: string;
  incident_reference: string;
  current_severity: string;
  proposed_severity?: string;
  original_severity?: string;
  justification?: string;
  actor_name: string;
  tenant_id: string;
}) {
  try {
    const { error } = await supabase.functions.invoke('send-incident-email', {
      body: payload,
    });
    if (error) {
      console.error('Failed to send notification:', error);
    }
  } catch (err) {
    console.error('Error invoking email function:', err);
  }
}

export function SeverityAdjustmentCard({ incident, investigation, onRefresh }: SeverityAdjustmentCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  
  // Actual severity state
  const [newSeverity, setNewSeverity] = useState<SeverityLevelV2 | ''>('');
  const [justification, setJustification] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  
  // Potential severity state
  const [newPotentialSeverity, setNewPotentialSeverity] = useState<SeverityLevelV2 | ''>('');
  const [potentialJustification, setPotentialJustification] = useState('');
  
  const { isLocked, isAssignedInvestigator, isOversightRole } = useInvestigationEditAccess(investigation, incident);

  // Type assertion for the extended incident properties
  const incidentExtended = incident as IncidentWithDetails & {
    original_severity?: SeverityLevel | null;
    severity_v2?: SeverityLevelV2 | null;
    original_severity_v2?: SeverityLevelV2 | null;
    severity_pending_approval?: boolean;
    severity_change_justification?: string | null;
    severity_approved_by?: string | null;
    severity_approved_at?: string | null;
    injury_classification?: string | null;
    erp_activated?: boolean | null;
    event_type?: string | null;
    // Potential severity fields
    potential_severity_v2?: SeverityLevelV2 | null;
    original_potential_severity_v2?: SeverityLevelV2 | null;
    potential_severity_pending_approval?: boolean;
    potential_severity_justification?: string | null;
    potential_severity_approved_by?: string | null;
    potential_severity_approved_at?: string | null;
  };

  // Calculate minimum severity based on incident data
  const { minLevel: minimumSeverity, reason: minSeverityReason } = useMemo(() => {
    return calculateMinimumSeverity(
      incidentExtended.injury_classification,
      incidentExtended.erp_activated,
      incidentExtended.event_type
    );
  }, [incidentExtended.injury_classification, incidentExtended.erp_activated, incidentExtended.event_type]);

  // Check if selected severity is below minimum
  const isBelowMinimum = useMemo(() => {
    if (!newSeverity) return false;
    return isSeverityBelowMinimum(newSeverity, minimumSeverity);
  }, [newSeverity, minimumSeverity]);

  // Get current severity (prefer v2, fallback to mapped old value)
  const currentSeverityV2 = incidentExtended.severity_v2 || mapOldSeverityToNew(incident.severity);
  const originalSeverityV2 = incidentExtended.original_severity_v2 || mapOldSeverityToNew(incidentExtended.original_severity || null);
  
  // Get potential severity
  const currentPotentialSeverityV2 = incidentExtended.potential_severity_v2;
  const originalPotentialSeverityV2 = incidentExtended.original_potential_severity_v2;

  const getSeverityVariant = (severity: string | null) => {
    if (!severity) return 'outline';
    const config = getSeverityConfig(severity as SeverityLevelV2);
    return config?.badgeVariant || 'outline';
  };

  const hasPendingChange = incidentExtended.severity_pending_approval;
  const hasPendingPotentialChange = incidentExtended.potential_severity_pending_approval;

  // Mutation to propose actual severity change
  const proposeMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');
      if (!newSeverity) throw new Error('No severity selected');
      if (!justification.trim()) throw new Error('Justification required');
      if (isBelowMinimum && !overrideReason.trim()) throw new Error('Override reason required');

      const originalSev = currentSeverityV2;

      const updateData: Record<string, unknown> = {
        original_severity_v2: originalSev,
        severity_v2: newSeverity,
        severity_change_justification: justification,
        severity_pending_approval: true,
        updated_at: new Date().toISOString(),
      };

      if (isBelowMinimum) {
        updateData.severity_override_reason = overrideReason;
      }

      const { error } = await supabase
        .from('incidents')
        .update(updateData)
        .eq('id', incident.id);

      if (error) throw error;

      await supabase.from('incident_audit_logs').insert({
        incident_id: incident.id,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'severity_change_proposed',
        old_value: { severity_v2: originalSev },
        new_value: { 
          severity_v2: newSeverity, 
          justification,
          override_reason: isBelowMinimum ? overrideReason : null,
          minimum_required: minimumSeverity 
        },
      });

      await sendSeverityNotification({
        type: 'severity_proposed',
        incident_id: incident.id,
        incident_title: incident.title,
        incident_reference: incident.reference_id || 'N/A',
        current_severity: originalSev || 'unknown',
        proposed_severity: newSeverity,
        justification,
        actor_name: profile.full_name || 'Unknown User',
        tenant_id: profile.tenant_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incident.id] });
      toast.success(t('investigation.severityChangeProposed', 'Severity change proposed. Awaiting HSSE Manager approval.'));
      setNewSeverity('');
      setJustification('');
      setOverrideReason('');
      onRefresh();
    },
    onError: (error) => {
      toast.error(t('common.error') + ': ' + error.message);
    },
  });

  // Mutation to propose potential severity change
  const proposePotentialMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');
      if (!newPotentialSeverity) throw new Error('No severity selected');
      if (!potentialJustification.trim()) throw new Error('Justification required');

      const originalPotentialSev = currentPotentialSeverityV2;

      const updateData: Record<string, unknown> = {
        original_potential_severity_v2: originalPotentialSev,
        potential_severity_v2: newPotentialSeverity,
        potential_severity_justification: potentialJustification,
        potential_severity_pending_approval: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('incidents')
        .update(updateData)
        .eq('id', incident.id);

      if (error) throw error;

      await supabase.from('incident_audit_logs').insert({
        incident_id: incident.id,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'potential_severity_change_proposed',
        old_value: { potential_severity_v2: originalPotentialSev },
        new_value: { 
          potential_severity_v2: newPotentialSeverity, 
          justification: potentialJustification,
        },
      });

      await sendSeverityNotification({
        type: 'potential_severity_proposed',
        incident_id: incident.id,
        incident_title: incident.title,
        incident_reference: incident.reference_id || 'N/A',
        current_severity: originalPotentialSev || 'not set',
        proposed_severity: newPotentialSeverity,
        justification: potentialJustification,
        actor_name: profile.full_name || 'Unknown User',
        tenant_id: profile.tenant_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incident.id] });
      toast.success(t('investigation.potentialSeverityChangeProposed', 'Potential severity proposed. Awaiting HSSE Manager approval.'));
      setNewPotentialSeverity('');
      setPotentialJustification('');
      onRefresh();
    },
    onError: (error) => {
      toast.error(t('common.error') + ': ' + error.message);
    },
  });

  // Mutation to approve actual severity change (HSSE Manager only)
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('incidents')
        .update({
          severity_pending_approval: false,
          severity_approved_by: user.id,
          severity_approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', incident.id);

      if (error) throw error;

      await supabase.from('incident_audit_logs').insert({
        incident_id: incident.id,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'severity_change_approved',
        new_value: { 
          approved_severity: currentSeverityV2,
          original_severity: originalSeverityV2 
        },
      });

      await sendSeverityNotification({
        type: 'severity_approved',
        incident_id: incident.id,
        incident_title: incident.title,
        incident_reference: incident.reference_id || 'N/A',
        current_severity: currentSeverityV2 || 'unknown',
        original_severity: originalSeverityV2 || undefined,
        actor_name: profile.full_name || 'Unknown User',
        tenant_id: profile.tenant_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incident.id] });
      toast.success(t('investigation.severityChangeApproved', 'Severity change approved'));
      onRefresh();
    },
    onError: (error) => {
      toast.error(t('common.error') + ': ' + error.message);
    },
  });

  // Mutation to approve potential severity change (HSSE Manager only)
  const approvePotentialMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('incidents')
        .update({
          potential_severity_pending_approval: false,
          potential_severity_approved_by: user.id,
          potential_severity_approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', incident.id);

      if (error) throw error;

      await supabase.from('incident_audit_logs').insert({
        incident_id: incident.id,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'potential_severity_change_approved',
        new_value: { 
          approved_potential_severity: currentPotentialSeverityV2,
          original_potential_severity: originalPotentialSeverityV2 
        },
      });

      await sendSeverityNotification({
        type: 'potential_severity_approved',
        incident_id: incident.id,
        incident_title: incident.title,
        incident_reference: incident.reference_id || 'N/A',
        current_severity: currentPotentialSeverityV2 || 'unknown',
        original_severity: originalPotentialSeverityV2 || undefined,
        actor_name: profile.full_name || 'Unknown User',
        tenant_id: profile.tenant_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incident.id] });
      toast.success(t('investigation.potentialSeverityChangeApproved', 'Potential severity change approved'));
      onRefresh();
    },
    onError: (error) => {
      toast.error(t('common.error') + ': ' + error.message);
    },
  });

  // Mutation to reject actual severity change
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');

      const proposedSev = currentSeverityV2;

      const { error } = await supabase
        .from('incidents')
        .update({
          severity_v2: originalSeverityV2 || currentSeverityV2,
          severity_pending_approval: false,
          severity_change_justification: null,
          severity_override_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', incident.id);

      if (error) throw error;

      await supabase.from('incident_audit_logs').insert({
        incident_id: incident.id,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'severity_change_rejected',
        old_value: { proposed_severity: proposedSev },
        new_value: { reverted_to: originalSeverityV2 },
      });

      await sendSeverityNotification({
        type: 'severity_rejected',
        incident_id: incident.id,
        incident_title: incident.title,
        incident_reference: incident.reference_id || 'N/A',
        current_severity: originalSeverityV2 || 'unknown',
        proposed_severity: proposedSev || undefined,
        original_severity: originalSeverityV2 || undefined,
        actor_name: profile.full_name || 'Unknown User',
        tenant_id: profile.tenant_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incident.id] });
      toast.success(t('investigation.severityChangeRejected', 'Severity change rejected'));
      onRefresh();
    },
    onError: (error) => {
      toast.error(t('common.error') + ': ' + error.message);
    },
  });

  // Mutation to reject potential severity change
  const rejectPotentialMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');

      const proposedPotentialSev = currentPotentialSeverityV2;

      const { error } = await supabase
        .from('incidents')
        .update({
          potential_severity_v2: originalPotentialSeverityV2 || null,
          potential_severity_pending_approval: false,
          potential_severity_justification: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', incident.id);

      if (error) throw error;

      await supabase.from('incident_audit_logs').insert({
        incident_id: incident.id,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'potential_severity_change_rejected',
        old_value: { proposed_potential_severity: proposedPotentialSev },
        new_value: { reverted_to: originalPotentialSeverityV2 },
      });

      await sendSeverityNotification({
        type: 'potential_severity_rejected',
        incident_id: incident.id,
        incident_title: incident.title,
        incident_reference: incident.reference_id || 'N/A',
        current_severity: originalPotentialSeverityV2 || 'not set',
        proposed_severity: proposedPotentialSev || undefined,
        original_severity: originalPotentialSeverityV2 || undefined,
        actor_name: profile.full_name || 'Unknown User',
        tenant_id: profile.tenant_id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incident.id] });
      toast.success(t('investigation.potentialSeverityChangeRejected', 'Potential severity change rejected'));
      onRefresh();
    },
    onError: (error) => {
      toast.error(t('common.error') + ': ' + error.message);
    },
  });

  const renderSeveritySection = (
    type: 'actual' | 'potential',
    currentValue: SeverityLevelV2 | null | undefined,
    originalValue: SeverityLevelV2 | null | undefined,
    hasPending: boolean | undefined,
    pendingJustification: string | null | undefined,
    newValue: SeverityLevelV2 | '',
    setNewValue: (v: SeverityLevelV2 | '') => void,
    justificationValue: string,
    setJustificationValue: (v: string) => void,
    proposeFn: () => void,
    approveFn: () => void,
    rejectFn: () => void,
    isPending: boolean
  ) => {
    const isActual = type === 'actual';
    const titleKey = isActual ? 'investigation.actualSeverity' : 'investigation.potentialSeverity';
    const descKey = isActual ? 'investigation.actualSeverityDesc' : 'investigation.potentialSeverityDesc';
    const titleFallback = isActual ? 'Actual Severity' : 'Potential Severity';
    const descFallback = isActual ? 'The actual outcome of this incident' : 'What could have happened in worst-case scenario';

    return (
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2">
            {isActual ? <AlertTriangle className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            {t(titleKey, titleFallback)}
          </h4>
          <p className="text-xs text-muted-foreground mt-1">{t(descKey, descFallback)}</p>
        </div>

        {/* Current Value Display */}
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {t('investigation.overview.currentSeverity', 'Current')}
            </p>
            <Badge variant={getSeverityVariant(currentValue || null)} className="text-sm">
              {currentValue ? t(`severity.${currentValue}.label`) : t('common.notSet', 'Not Set')}
            </Badge>
          </div>
          {originalValue && originalValue !== currentValue && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {t('investigation.overview.originalSeverity', 'Original')}
              </p>
              <Badge variant="outline" className="text-sm">
                {t(`severity.${originalValue}.label`)}
              </Badge>
            </div>
          )}
          {hasPending && (
            <Badge variant="outline" className="gap-1 border-warning text-warning ms-auto">
              <Clock className="h-3 w-3" />
              {t('investigation.overview.pendingApproval', 'Pending Approval')}
            </Badge>
          )}
        </div>

        {/* Locked State */}
        {isLocked ? (
          <div className="bg-muted/50 border rounded-md p-3 flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t('investigation.severityLockedMessage', 'Severity changes are locked after investigation submission')}
            </span>
          </div>
        ) : hasPending ? (
          /* Pending Approval View */
          <div className="space-y-4">
            <div className="bg-warning/10 border border-warning/20 rounded-md p-3">
              <p className="text-sm font-medium mb-2">
                {t('investigation.overview.justification', 'Justification')}:
              </p>
              <p className="text-sm text-muted-foreground">
                {pendingJustification}
              </p>
            </div>

            {isOversightRole && (
              <div className="flex gap-2">
                <Button 
                  onClick={approveFn}
                  disabled={isPending}
                  className="flex-1"
                  variant="default"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                  <CheckCircle className="h-4 w-4 me-2" />
                  {t('investigation.overview.approve', 'Approve')}
                </Button>
                <Button 
                  onClick={rejectFn}
                  disabled={isPending}
                  className="flex-1"
                  variant="destructive"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                  <XCircle className="h-4 w-4 me-2" />
                  {t('investigation.overview.reject', 'Reject')}
                </Button>
              </div>
            )}
          </div>
        ) : isAssignedInvestigator ? (
          /* Propose Change Form */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                {isActual 
                  ? t('investigation.overview.proposedSeverity', 'Proposed Severity')
                  : t('investigation.proposedPotentialSeverity', 'Proposed Potential Severity')
                }
              </Label>
              <Select value={newValue} onValueChange={(v) => setNewValue(v as SeverityLevelV2)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('investigation.overview.selectSeverity', 'Select severity...')} />
                </SelectTrigger>
                <SelectContent dir={direction}>
                  {HSSE_SEVERITY_LEVELS.map((level) => {
                    const config = getSeverityConfig(level.value);
                    return (
                      <SelectItem 
                        key={level.value} 
                        value={level.value}
                        disabled={level.value === currentValue}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: config?.color }}
                          />
                          <span>{t(level.labelKey)}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Validation Warning (only for actual severity) */}
            {isActual && isBelowMinimum && (
              <div className="bg-warning/10 border border-warning/30 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-warning">
                      {t('severity.validation.belowMinimum', 'Below Minimum Required')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {minSeverityReason && t(minSeverityReason)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('severity.validation.minimumRequired', 'Minimum required: {{level}}', { 
                        level: t(`severity.${minimumSeverity}.label`) 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>
                {isActual 
                  ? t('investigation.overview.justification', 'Justification')
                  : t('investigation.potentialJustification', 'Potential Severity Justification')
                } *
              </Label>
              <Textarea 
                value={justificationValue}
                onChange={(e) => setJustificationValue(e.target.value)}
                placeholder={
                  isActual 
                    ? t('investigation.overview.justificationPlaceholder', 'Explain why the severity should be changed...')
                    : t('investigation.potentialJustificationPlaceholder', 'Explain the potential worst-case scenario...')
                }
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {t('investigation.overview.justificationNote', 'Changes require HSSE Manager approval')}
              </p>
            </div>

            {/* Override Reason (only for actual severity when below minimum) */}
            {isActual && isBelowMinimum && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" />
                  {t('severity.overrideReason', 'Override Reason')} *
                </Label>
                <Textarea 
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder={t('severity.overridePlaceholder', 'Document why this event is rated below the standard minimum...')}
                  rows={2}
                  className="border-warning/50"
                />
                <p className="text-xs text-muted-foreground">
                  {t('severity.overrideAuditNote', 'This will be logged for audit purposes')}
                </p>
              </div>
            )}

            <Button 
              onClick={proposeFn}
              disabled={
                !newValue || 
                !justificationValue.trim() || 
                (isActual && isBelowMinimum && !overrideReason.trim()) || 
                isPending
              }
              className="w-full"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {isActual 
                ? t('investigation.overview.proposeChange', 'Propose Severity Change')
                : t('investigation.proposePotentialChange', 'Set Potential Severity')
              }
            </Button>
          </div>
        ) : (
          /* Read-only for non-investigators */
          <div className="bg-muted/50 border rounded-md p-3 flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t('investigation.severityInvestigatorOnly', 'Only the assigned investigator can propose severity changes')}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={(hasPendingChange || hasPendingPotentialChange) ? 'border-warning' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t('investigation.severityAssessment', 'Severity Assessment')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent dir={direction}>
        <Tabs defaultValue="actual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="actual" className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              {t('investigation.actualSeverity', 'Actual')}
              {hasPendingChange && <Clock className="h-3 w-3 text-warning" />}
            </TabsTrigger>
            <TabsTrigger value="potential" className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" />
              {t('investigation.potentialSeverity', 'Potential')}
              {hasPendingPotentialChange && <Clock className="h-3 w-3 text-warning" />}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="actual">
            {renderSeveritySection(
              'actual',
              currentSeverityV2,
              originalSeverityV2,
              hasPendingChange,
              incidentExtended.severity_change_justification,
              newSeverity,
              setNewSeverity,
              justification,
              setJustification,
              () => proposeMutation.mutate(),
              () => approveMutation.mutate(),
              () => rejectMutation.mutate(),
              proposeMutation.isPending || approveMutation.isPending || rejectMutation.isPending
            )}
          </TabsContent>
          
          <TabsContent value="potential">
            {renderSeveritySection(
              'potential',
              currentPotentialSeverityV2,
              originalPotentialSeverityV2,
              hasPendingPotentialChange,
              incidentExtended.potential_severity_justification,
              newPotentialSeverity,
              setNewPotentialSeverity,
              potentialJustification,
              setPotentialJustification,
              () => proposePotentialMutation.mutate(),
              () => approvePotentialMutation.mutate(),
              () => rejectPotentialMutation.mutate(),
              proposePotentialMutation.isPending || approvePotentialMutation.isPending || rejectPotentialMutation.isPending
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
