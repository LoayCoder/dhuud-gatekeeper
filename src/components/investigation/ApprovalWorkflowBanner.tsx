import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  CheckCircle, Clock, Lock, Play, Shield, Loader2, 
  AlertTriangle, FileCheck 
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { IncidentWithDetails } from "@/hooks/use-incidents";
import type { Investigation } from "@/hooks/use-investigation";

interface ApprovalWorkflowBannerProps {
  incident: IncidentWithDetails;
  investigation: Investigation | null;
  onRefresh: () => void;
}

export function ApprovalWorkflowBanner({ incident, investigation, onRefresh }: ApprovalWorkflowBannerProps) {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  // Don't render for closure workflow statuses - IncidentClosureApprovalCard handles those
  const closureStatuses = ['pending_closure', 'pending_final_closure', 'investigation_closed', 'closed'];
  if (closureStatuses.includes(incident.status as string)) {
    return null;
  }
  
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');

  // Type assertion for extended incident properties
  const incidentExtended = incident as IncidentWithDetails & {
    approved_by?: string | null;
    approved_at?: string | null;
    approval_notes?: string | null;
    investigation_locked?: boolean;
  };

  const isApproved = !!incidentExtended.approved_at;
  const isLocked = incidentExtended.investigation_locked ?? false;
  const hasInvestigator = !!investigation?.investigator_id;
  const isInvestigationStarted = !!investigation?.started_at;
  const isCurrentUserInvestigator = investigation?.investigator_id === user?.id;

  // Approve incident mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('incidents')
        .update({
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          approval_notes: approvalNotes || null,
          investigation_locked: true,
          status: 'investigation_pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', incident.id);

      if (error) throw error;

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incident.id,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'incident_approved',
        new_value: { notes: approvalNotes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', incident.id] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(t('investigation.incidentApproved', 'Incident approved and locked for investigation'));
      setShowApproveDialog(false);
      setApprovalNotes('');
      onRefresh();
    },
    onError: (error) => {
      toast.error(t('common.error') + ': ' + error.message);
    },
  });

  // Start investigation mutation
  const startInvestigationMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');
      if (!investigation?.id) throw new Error('No investigation record');

      const { error } = await supabase
        .from('investigations')
        .update({
          started_at: new Date().toISOString(),
        })
        .eq('id', investigation.id);

      if (error) throw error;

      // Update incident status
      await supabase
        .from('incidents')
        .update({
          status: 'investigation_in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', incident.id);

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incident.id,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'investigation_started',
        new_value: { investigation_id: investigation.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation', incident.id] });
      queryClient.invalidateQueries({ queryKey: ['incident', incident.id] });
      toast.success(t('investigation.started', 'Investigation started'));
      onRefresh();
    },
    onError: (error) => {
      toast.error(t('common.error') + ': ' + error.message);
    },
  });

  // Determine current workflow state
  const getWorkflowState = () => {
    if (isInvestigationStarted) return 'in_progress';
    if (hasInvestigator && isApproved) return 'ready_to_start';
    if (isApproved && !hasInvestigator) return 'awaiting_assignment';
    if (hasInvestigator && !isApproved) return 'awaiting_approval';
    return 'pending';
  };

  const workflowState = getWorkflowState();

  // Render based on workflow state
  const renderContent = () => {
    switch (workflowState) {
      case 'in_progress':
        return (
          <Alert className="bg-primary/10 border-primary/20">
            <Shield className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">
              {t('investigation.workflow.inProgress', 'Investigation In Progress')}
            </AlertTitle>
            <AlertDescription className="flex items-center gap-2">
              <Badge variant="default" className="gap-1">
                <Lock className="h-3 w-3" />
                {t('investigation.workflow.locked', 'Reporter data is locked')}
              </Badge>
            </AlertDescription>
          </Alert>
        );

      case 'ready_to_start':
        return (
          <Alert className="bg-success/10 border-success/20">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertTitle className="text-success">
              {t('investigation.workflow.readyToStart', 'Ready to Start Investigation')}
            </AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2">
              <span className="text-muted-foreground">
                {t('investigation.workflow.assignedAndApproved', 'Incident approved and investigator assigned.')}
              </span>
              {isCurrentUserInvestigator && (
                <Button 
                  onClick={() => startInvestigationMutation.mutate()}
                  disabled={startInvestigationMutation.isPending}
                  size="sm"
                  className="gap-2"
                >
                  {startInvestigationMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {t('investigation.workflow.startBtn', 'Start Investigation')}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        );

      case 'awaiting_assignment':
        return (
          <Alert className="bg-warning/10 border-warning/20">
            <Clock className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning">
              {t('investigation.workflow.awaitingAssignment', 'Awaiting Investigator Assignment')}
            </AlertTitle>
            <AlertDescription>
              {t('investigation.workflow.assignPrompt', 'Incident approved. Please assign an investigator to proceed.')}
            </AlertDescription>
          </Alert>
        );

      case 'awaiting_approval':
        return (
          <Alert className="bg-info/10 border-info/20">
            <FileCheck className="h-4 w-4 text-info" />
            <AlertTitle className="text-info">
              {t('investigation.workflow.awaitingApproval', 'Awaiting Approval')}
            </AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2">
              <span className="text-muted-foreground">
                {t('investigation.workflow.approvePrompt', 'Investigator assigned. Approve to lock reporter data and start investigation.')}
              </span>
              <Button 
                onClick={() => setShowApproveDialog(true)}
                size="sm"
                variant="default"
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {t('investigation.workflow.approveBtn', 'Approve & Lock')}
              </Button>
            </AlertDescription>
          </Alert>
        );

      default: // pending
        return (
          <Alert className="bg-muted border-muted-foreground/20">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <AlertTitle>
              {t('investigation.workflow.pending', 'Pending Investigation Setup')}
            </AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-2">
              <span className="text-muted-foreground">
                {t('investigation.workflow.setupPrompt', 'Assign an investigator and approve the incident to begin.')}
              </span>
              {!hasInvestigator && (
                <Badge variant="outline" className="gap-1">
                  {t('investigation.workflow.step1', '1. Assign Investigator')}
                </Badge>
              )}
              {!isApproved && (
                <Badge variant="outline" className="gap-1">
                  {t('investigation.workflow.step2', '2. Approve Incident')}
                </Badge>
              )}
            </AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <>
      {renderContent()}

      {/* Approval Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('investigation.workflow.approveTitle', 'Approve Incident for Investigation')}</DialogTitle>
            <DialogDescription>
              {t('investigation.workflow.approveDescription', 'This will lock the reporter\'s submitted data and allow the investigation to begin. This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-warning/10 border border-warning/20 rounded-md p-3 text-sm">
              <div className="flex items-center gap-2 text-warning font-medium mb-1">
                <Lock className="h-4 w-4" />
                {t('investigation.workflow.lockWarning', 'Reporter data will become read-only')}
              </div>
              <p className="text-muted-foreground">
                {t('investigation.workflow.lockExplanation', 'Only investigation fields will remain editable after approval.')}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('investigation.workflow.approvalNotes', 'Approval Notes (Optional)')}
              </label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder={t('investigation.workflow.notesPlaceholder', 'Add any notes about this approval...')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              <CheckCircle className="h-4 w-4 me-2" />
              {t('investigation.workflow.confirmApprove', 'Approve & Lock')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
