import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Clock, CheckCircle, XCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { IncidentWithDetails } from "@/hooks/use-incidents";
import type { Database } from "@/integrations/supabase/types";

type SeverityLevel = Database['public']['Enums']['severity_level'];

interface SeverityAdjustmentCardProps {
  incident: IncidentWithDetails;
  onRefresh: () => void;
}

export function SeverityAdjustmentCard({ incident, onRefresh }: SeverityAdjustmentCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [newSeverity, setNewSeverity] = useState<SeverityLevel | ''>('');
  const [justification, setJustification] = useState('');

  const severityOptions: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];

  const getSeverityVariant = (severity: string | null) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  // Type assertion for the extended incident properties
  const incidentExtended = incident as IncidentWithDetails & {
    original_severity?: SeverityLevel | null;
    severity_pending_approval?: boolean;
    severity_change_justification?: string | null;
    severity_approved_by?: string | null;
    severity_approved_at?: string | null;
  };

  const hasPendingChange = incidentExtended.severity_pending_approval;
  const originalSeverity = incidentExtended.original_severity;

  // Mutation to propose severity change
  const proposeMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');
      if (!newSeverity) throw new Error('No severity selected');
      if (!justification.trim()) throw new Error('Justification required');

      const { error } = await supabase
        .from('incidents')
        .update({
          severity: newSeverity,
          severity_change_justification: justification,
          severity_pending_approval: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', incident.id);

      if (error) throw error;

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incident.id,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'severity_change_proposed',
        old_value: { severity: incident.severity },
        new_value: { severity: newSeverity, justification },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incident.id] });
      toast.success(t('investigation.severityChangeProposed', 'Severity change proposed. Awaiting HSSE Manager approval.'));
      setNewSeverity('');
      setJustification('');
      onRefresh();
    },
    onError: (error) => {
      toast.error(t('common.error') + ': ' + error.message);
    },
  });

  // Mutation to approve severity change (HSSE Manager only)
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

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incident.id,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'severity_change_approved',
        new_value: { 
          approved_severity: incident.severity,
          original_severity: originalSeverity 
        },
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

  // Mutation to reject severity change
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');

      // Revert to original severity
      const { error } = await supabase
        .from('incidents')
        .update({
          severity: originalSeverity || incident.severity,
          severity_pending_approval: false,
          severity_change_justification: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', incident.id);

      if (error) throw error;

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incident.id,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'severity_change_rejected',
        old_value: { proposed_severity: incident.severity },
        new_value: { reverted_to: originalSeverity },
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

  return (
    <Card className={hasPendingChange ? 'border-warning' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t('investigation.overview.severityAdjustment', 'Severity Adjustment')}
          </CardTitle>
          {hasPendingChange && (
            <Badge variant="outline" className="gap-1 border-warning text-warning">
              <Clock className="h-3 w-3" />
              {t('investigation.overview.pendingApproval', 'Pending Approval')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent dir={direction}>
        {/* Current Severity Display */}
        <div className="flex items-center gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {t('investigation.overview.currentSeverity', 'Current Severity')}
            </p>
            <Badge variant={getSeverityVariant(incident.severity)} className="text-sm">
              {incident.severity ? t(`incidents.severity.${incident.severity}`) : t('common.notSet')}
            </Badge>
          </div>
          {originalSeverity && originalSeverity !== incident.severity && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {t('investigation.overview.originalSeverity', 'Original')}
              </p>
              <Badge variant="outline" className="text-sm">
                {t(`incidents.severity.${originalSeverity}`)}
              </Badge>
            </div>
          )}
        </div>

        {/* Pending Approval View */}
        {hasPendingChange ? (
          <div className="space-y-4">
            <div className="bg-warning/10 border border-warning/20 rounded-md p-3">
              <p className="text-sm font-medium mb-2">
                {t('investigation.overview.justification', 'Justification')}:
              </p>
              <p className="text-sm text-muted-foreground">
                {incidentExtended.severity_change_justification}
              </p>
            </div>

            {/* Approval Buttons (for HSSE Manager) */}
            <div className="flex gap-2">
              <Button 
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="flex-1"
                variant="default"
              >
                {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                <CheckCircle className="h-4 w-4 me-2" />
                {t('investigation.overview.approve', 'Approve')}
              </Button>
              <Button 
                onClick={() => rejectMutation.mutate()}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className="flex-1"
                variant="destructive"
              >
                {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                <XCircle className="h-4 w-4 me-2" />
                {t('investigation.overview.reject', 'Reject')}
              </Button>
            </div>
          </div>
        ) : (
          /* Propose Change Form */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('investigation.overview.proposedSeverity', 'Proposed Severity')}</Label>
              <Select value={newSeverity} onValueChange={(v) => setNewSeverity(v as SeverityLevel)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('investigation.overview.selectSeverity', 'Select new severity...')} />
                </SelectTrigger>
                <SelectContent dir={direction}>
                  {severityOptions.map((sev) => (
                    <SelectItem 
                      key={sev} 
                      value={sev}
                      disabled={sev === incident.severity}
                    >
                      <Badge variant={getSeverityVariant(sev)} className="me-2">
                        {t(`incidents.severity.${sev}`)}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('investigation.overview.justification', 'Justification')} *</Label>
              <Textarea 
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder={t('investigation.overview.justificationPlaceholder', 'Explain why the severity should be changed...')}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {t('investigation.overview.justificationNote', 'Severity changes require HSSE Manager approval')}
              </p>
            </div>

            <Button 
              onClick={() => proposeMutation.mutate()}
              disabled={!newSeverity || !justification.trim() || proposeMutation.isPending}
              className="w-full"
            >
              {proposeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t('investigation.overview.proposeChange', 'Propose Severity Change')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
