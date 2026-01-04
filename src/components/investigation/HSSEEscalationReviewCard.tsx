import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ClipboardCheck, 
  XCircle, 
  CheckCircle2, 
  ArrowUpCircle,
  Loader2,
  AlertTriangle,
  User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCanReviewHSSEEscalation, useHSSEEscalationReview } from "@/hooks/use-hsse-escalation-review";
import type { IncidentWithDetails } from "@/hooks/use-incidents";

interface HSSEEscalationReviewCardProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

const MIN_NOTES_LENGTH = 10;

export function HSSEEscalationReviewCard({ incident, onComplete }: HSSEEscalationReviewCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  
  const [notes, setNotes] = useState("");
  const [selectedInvestigator, setSelectedInvestigator] = useState<string>("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  
  const { data: canReview } = useCanReviewHSSEEscalation(incident.id);
  const escalationReview = useHSSEEscalationReview();
  
  // Fetch HSSE-eligible users for investigator selection
  const { data: investigators = [], isLoading: loadingInvestigators } = useQuery({
    queryKey: ['hsse-investigators', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, job_title, employee_id')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .or('is_deleted.is.null,is_deleted.eq.false');

      if (usersError) throw usersError;

      const userIds = usersData?.map(u => u.id) || [];
      if (userIds.length === 0) return [];

      const { data: roleData, error: roleError } = await supabase
        .from('user_role_assignments')
        .select('user_id, role:roles(code, category)')
        .in('user_id', userIds);

      if (roleError) throw roleError;

      const hsseRoleCodes = ['hsse_officer', 'hsse_investigator', 'hsse_manager', 'hsse_expert', 'incident_analyst', 'admin'];
      const hsseUserIds = new Set(
        roleData?.filter(ra => {
          const role = ra.role as { code: string; category: string } | null;
          return role && (hsseRoleCodes.includes(role.code) || role.category === 'hsse');
        }).map(ra => ra.user_id) || []
      );

      return usersData?.filter(p => hsseUserIds.has(p.id)) || [];
    },
    enabled: !!profile?.tenant_id && !!canReview,
  });
  
  // Only show for observations in pending_hsse_escalation_review status
  if (!canReview) {
    return null;
  }
  
  const isNotesValid = notes.length >= MIN_NOTES_LENGTH;
  const canUpgrade = selectedInvestigator && isNotesValid;
  
  const handleReject = () => {
    escalationReview.mutate({
      incidentId: incident.id,
      decision: 'reject',
      notes,
    }, {
      onSuccess: () => {
        setShowRejectDialog(false);
        onComplete();
      },
    });
  };
  
  const handleAcceptAsObservation = () => {
    escalationReview.mutate({
      incidentId: incident.id,
      decision: 'accept_observation',
      notes: notes || undefined,
    }, {
      onSuccess: onComplete,
    });
  };
  
  const handleUpgradeToIncident = () => {
    escalationReview.mutate({
      incidentId: incident.id,
      decision: 'upgrade_incident',
      notes,
      investigatorId: selectedInvestigator,
    }, {
      onSuccess: () => {
        setShowUpgradeDialog(false);
        onComplete();
      },
    });
  };

  // Get escalation notes from dept rep if available
  const deptRepNotes = (incident as any).dept_rep_notes;

  return (
    <>
      <Card className="border-amber-500/50 bg-amber-500/5" dir={direction}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg">
                {t('workflow.escalationReview.title', 'HSSE Escalation Review')}
              </CardTitle>
            </div>
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              {t('workflow.escalationReview.pendingReview', 'Escalation Pending')}
            </Badge>
          </div>
          <CardDescription>
            {t('workflow.escalationReview.description', 'Department Representative has requested this observation be escalated for investigation. Review and decide on the appropriate action.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Observation Summary */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{incident.reference_id}</span>
              <Badge variant="secondary">{incident.event_type}</Badge>
              {(incident as any).severity_level && (
                <Badge variant="outline">L{(incident as any).severity_level}</Badge>
              )}
            </div>
            <h4 className="font-medium">{incident.title}</h4>
            <p className="text-sm text-muted-foreground line-clamp-2">{incident.description}</p>
          </div>
          
          {/* Dept Rep Escalation Notes */}
          {deptRepNotes && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
              <p className="text-sm font-medium text-blue-800 mb-1">
                {t('workflow.escalationReview.deptRepNotes', 'Dept Rep Escalation Notes')}:
              </p>
              <p className="text-sm text-blue-700">{deptRepNotes}</p>
            </div>
          )}
          
          {/* Decision Notes */}
          <div className="space-y-2">
            <Label htmlFor="escalation-notes">
              {t('workflow.escalationReview.notes', 'Decision Notes')}
              <span className="text-muted-foreground text-xs ms-1">
                ({t('common.required', 'required')} {t('workflow.escalationReview.forRejectUpgrade', 'for Reject/Upgrade')})
              </span>
            </Label>
            <Textarea
              id="escalation-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('workflow.escalationReview.notesPlaceholder', 'Provide justification for your decision...')}
              rows={3}
            />
            <p className={`text-xs ${notes.length >= MIN_NOTES_LENGTH ? 'text-green-600' : 'text-muted-foreground'}`}>
              {notes.length}/{MIN_NOTES_LENGTH} {t('common.characters', 'characters minimum')}
            </p>
          </div>
          
          {/* Decision Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            {/* Reject Escalation */}
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => setShowRejectDialog(true)}
              disabled={escalationReview.isPending}
            >
              <XCircle className="h-4 w-4" />
              {t('workflow.escalationReview.rejectEscalation', 'Reject Escalation')}
            </Button>
            
            {/* Accept - Keep as Observation */}
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2 text-blue-600 border-blue-300 hover:bg-blue-50"
              onClick={handleAcceptAsObservation}
              disabled={escalationReview.isPending}
            >
              {escalationReview.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t('workflow.escalationReview.acceptAsObservation', 'Accept – Keep as Observation')}
            </Button>
            
            {/* Upgrade to Incident */}
            <Button
              className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700"
              onClick={() => setShowUpgradeDialog(true)}
              disabled={escalationReview.isPending}
            >
              <ArrowUpCircle className="h-4 w-4" />
              {t('workflow.escalationReview.upgradeToIncident', 'Upgrade to Incident')}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              {t('workflow.escalationReview.rejectDialogTitle', 'Reject Escalation?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('workflow.escalationReview.rejectDialogDescription', 'The escalation request will be rejected and the observation will be returned to the Department Representative for action.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {!isNotesValid && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('common.required', 'Required')}</AlertTitle>
              <AlertDescription>
                {t('workflow.escalationReview.rejectionReasonRequired', 'Please provide a reason for rejection (minimum 10 characters)')}
              </AlertDescription>
            </Alert>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!isNotesValid || escalationReview.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {escalationReview.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t('workflow.escalationReview.confirmReject', 'Reject Escalation')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Upgrade Dialog */}
      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent dir={direction} className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <ArrowUpCircle className="h-5 w-5" />
              {t('workflow.escalationReview.upgradeDialogTitle', 'Upgrade to Incident?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('workflow.escalationReview.upgradeDialogDescription', 'This action will convert the observation into an incident and start the incident investigation workflow.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">
              {t('workflow.escalationReview.upgradeWarningTitle', 'Important')}
            </AlertTitle>
            <AlertDescription className="text-amber-700 text-sm">
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li>{t('workflow.escalationReview.upgradeWarning1', 'A new INC reference number will be generated')}</li>
                <li>{t('workflow.escalationReview.upgradeWarning2', 'The original observation will be linked for audit trail')}</li>
                <li>{t('workflow.escalationReview.upgradeWarning3', 'Evidence and data will be carried forward')}</li>
                <li>{t('workflow.escalationReview.upgradeWarning4', 'Investigation workflow with RCA will be required')}</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          {/* Investigator Assignment */}
          <div className="space-y-2">
            <Label htmlFor="investigator">
              {t('workflow.escalationReview.assignInvestigator', 'Assign Investigator')} *
            </Label>
            <Select 
              value={selectedInvestigator} 
              onValueChange={setSelectedInvestigator}
              disabled={loadingInvestigators}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('workflow.escalationReview.selectInvestigator', 'Select an investigator...')} />
              </SelectTrigger>
              <SelectContent>
                {investigators.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{inv.full_name}</span>
                      {inv.job_title && (
                        <span className="text-muted-foreground text-xs">({inv.job_title})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {!isNotesValid && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('common.required', 'Required')}</AlertTitle>
              <AlertDescription>
                {t('workflow.escalationReview.upgradeNotesRequired', 'Please provide justification notes (minimum 10 characters)')}
              </AlertDescription>
            </Alert>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpgradeToIncident}
              disabled={!canUpgrade || escalationReview.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {escalationReview.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t('workflow.escalationReview.confirmUpgrade', 'Upgrade to Incident')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

