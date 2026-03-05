import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Calendar, Building, Building2, MapPin, ExternalLink, Tag, HeartPulse, Users, Crown } from 'lucide-react';
import { IncidentAttachmentsSection } from '@/features/incidents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useIncident, useDeleteIncident } from '@/features/incidents';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useState } from 'react';
import { generateIncidentReportPDF } from '@/lib/generate-incident-report-pdf';
import { toast } from 'sonner';
import { getSubtypeTranslation, snakeToCamel, getHsseEventTypeForSubtype } from '@/lib/hsse-translation-utils';
import { HSSEValidationCard } from '@/features/investigation';
import { ObservationClosureGate } from '@/features/investigation';
import { HSSEExpertRejectionReviewCard } from '@/features/investigation';
import { ContractorViolationSection } from '@/features/investigation';
import { DeptManagerViolationApprovalCard } from '@/features/investigation';
import { ContractControllerApprovalCard } from '@/features/investigation';
import { ContractorSiteRepAcknowledgeCard } from '@/features/investigation';
import { HSSEViolationReviewCard } from '@/features/investigation';
import { EscalationAlertBanner } from '@/features/investigation';
import { HSSEObservationValidationCard } from '@/features/investigation';
import { HSSEEnforcementBanner } from '@/features/investigation';
import { ObservationWorkflowTracker } from '@/features/investigation';
import { useQuery } from '@tanstack/react-query';
import {
  IncidentDetailHeader,
  IncidentRiskPanel,
  IncidentWorkflowCard,
  IncidentInjuryCard,
  IncidentDamageCard,
  IncidentInfoSidebar,
} from '@/features/incidents';
import { IncidentDetailsLayout } from '@/features/incidents';

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: incident, isLoading } = useIncident(id);
  const { isAdmin, profile } = useAuth();

  // Fetch tenant name for legal evidence metadata
  const { data: tenantInfo } = useQuery({
    queryKey: ['tenant-info', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return null;
      const { data } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', profile.tenant_id)
        .single();
      return data;
    },
    enabled: !!profile?.tenant_id
  });

  // Fetch investigation data for current owner display and team info
  const { data: investigation } = useQuery({
    queryKey: ['investigation-owner', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from('investigations')
        .select(`
          investigator_id, 
          investigator:profiles!investigator_id(full_name),
          investigation_type,
          team_leader_id,
          team_leader:profiles!team_leader_id(full_name),
          team_member_ids
        `)
        .eq('incident_id', id)
        .maybeSingle();
      return data;
    },
    enabled: !!id
  });

  // Fetch team member names if team investigation
  const teamMemberIds = investigation?.team_member_ids as string[] | null;
  const { data: teamMembers } = useQuery({
    queryKey: ['investigation-team-members', teamMemberIds],
    queryFn: async () => {
      if (!teamMemberIds || teamMemberIds.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', teamMemberIds);
      return data || [];
    },
    enabled: !!teamMemberIds && teamMemberIds.length > 0
  });

  // Get current owner based on incident status
  const getCurrentOwner = () => {
    if (!incident) return null;
    const status = incident.status as string;

    if (status === 'submitted' || status === 'pending_review') {
      return { role: t('incidents.workflowOwners.hsse_expert', 'HSSE Expert'), name: null };
    }
    // Contractor Consultant screening statuses (expert_screening is legacy)
    if (status === 'expert_screening' || status === 'pending_consultant_screening' ||
      status === 'pending_consultant_review' || status === 'pending_consultant_actions') {
      return { role: t('incidents.workflowOwners.consultant', 'Contractor Consultant'), name: null };
    }
    if (status === 'pending_manager_approval' || status === 'hsse_manager_escalation') {
      return { role: t('incidents.workflowOwners.department_manager', 'Department Manager'), name: null };
    }
    if (status === 'pending_dept_rep_approval') {
      return { role: t('incidents.workflowOwners.department_rep', 'Department Representative'), name: null };
    }
    if (status === 'pending_department_manager_approval') {
      return { role: t('incidents.workflowOwners.department_manager', 'Department Manager'), name: null };
    }
    if (status === 'pending_clinic_review') {
      return { role: t('incidents.workflowOwners.clinic_team', 'Clinic Team'), name: null };
    }
    if (status === 'investigation_in_progress' || status === 'investigation_pending') {
      const investigatorName = (investigation?.investigator as any)?.full_name;
      return {
        role: t('incidents.workflowOwners.investigator', 'Investigator'),
        name: investigatorName || null
      };
    }
    if (status === 'pending_closure' || status === 'pending_final_closure' || status === 'observation_actions_pending') {
      return { role: t('incidents.workflowOwners.hsse_manager', 'HSSE Manager'), name: null };
    }
    if (status === 'closed' || status === 'no_investigation_required' || status === 'investigation_closed' || status === 'hsse_enforced') {
      return null;
    }
    // New contractor workflow statuses
    if (status === 'pending_consultant_screening' || status === 'pending_action_dispute_review') {
      return { role: t('incidents.workflowOwners.consultant', 'Contractor Consultant'), name: null };
    }
    if (status === 'pending_dept_rep_review') {
      return { role: t('incidents.workflowOwners.department_rep', 'Department Representative'), name: null };
    }
    if (status === 'pending_hsse_expert_review') {
      return { role: t('incidents.workflowOwners.hsse_expert', 'HSSE Expert'), name: null };
    }
    return { role: t('incidents.workflowOwners.awaiting_assignment', 'Awaiting Assignment'), name: null };
  };

  const currentOwner = getCurrentOwner();

  // Determine back navigation path based on where user came from
  const searchParams = new URLSearchParams(location.search);
  const fromPage = searchParams.get('from');
  const backPath = fromPage === 'my-actions' ? '/incidents/my-actions' : '/incidents';

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const deleteIncident = useDeleteIncident();

  const handleConfirmDelete = async () => {
    if (!id) return;
    await deleteIncident.mutateAsync(id);
    navigate('/incidents');
  };

  const handlePrintReport = async (options?: { fullLegalMode?: boolean; includeFullAuditLog?: boolean }) => {
    if (!incident || !profile?.tenant_id) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      toast.error(t('common.error'));
      return;
    }

    setIsPrinting(true);
    toast.loading(t('incidents.reportGenerating'));

    try {
      await generateIncidentReportPDF({
        incident,
        tenantId: profile.tenant_id,
        userId: user.id,
        language: i18n.language as 'en' | 'ar',
        fullLegalMode: options?.fullLegalMode,
        includeFullAuditLog: options?.includeFullAuditLog,
      });
      toast.dismiss();
      toast.success(t('incidents.reportGenerated'));
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.dismiss();
      toast.error(t('common.error'));
    } finally {
      setIsPrinting(false);
    }
  };

  // Parse media attachments
  const mediaAttachments = incident?.media_attachments as Array<{ url: string; type: string; name: string }> | null;

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-6 space-y-6" dir={direction}>
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="container max-w-4xl py-6" dir={direction}>
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('incidents.notFound')}</h3>
            <Button asChild variant="outline">
              <Link to={backPath} className="gap-2">
                {t('incidents.backToList')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 space-y-6" dir={direction}>
      {/* Executive Header */}
      <IncidentDetailHeader
        incident={{
          id: incident.id,
          title: incident.title,
          reference_id: incident.reference_id || '',
          event_type: incident.event_type,
          status: incident.status,
          severity_v2: incident.severity_v2,
          severity: (incident as any).severity,
          potential_severity_v2: (incident as any).potential_severity_v2,
          branch: incident.branch,
          site: incident.site,
          location: incident.location,
          occurred_at: incident.occurred_at,
          created_at: incident.created_at,
          branch_id: incident.branch_id,
          site_id: incident.site_id,
          related_contractor_company_id: incident.related_contractor_company_id,
        }}
        backPath={backPath}
        isAdmin={isAdmin}
        isPrinting={isPrinting}
        onPrint={handlePrintReport}
        onDelete={() => setDeleteDialogOpen(true)}
      />

      {/* C10: OSHA Reportable Banner */}
      {(incident as any).osha_reportable && (
        <Alert variant="destructive" className="border-destructive bg-destructive/10">
          <AlertTriangle className="h-5 w-5" />
          <div className="ms-2">
            <p className="font-semibold text-destructive">
              {t('incidents.oshaReportable.title', 'OSHA Reportable Incident')}
            </p>
            <p className="text-sm text-destructive/80">
              {t('incidents.oshaReportable.description', 'This incident involves fatality, hospitalization, amputation, or loss of eye and must be reported to OSHA within regulatory timeframes.')}
            </p>
          </div>
        </Alert>
      )}

      {/* Escalation Alert Banner */}
      {(incident as any).requires_escalation && (
        <EscalationAlertBanner
          incident={{
            id: incident.id,
            requires_escalation: (incident as any).requires_escalation,
            escalation_reason: (incident as any).escalation_reason,
            escalation_level: (incident as any).escalation_level,
            escalation_triggered_at: (incident as any).escalation_triggered_at,
            related_contractor_company_id: incident.related_contractor_company_id,
            contractor_company: (incident as any).contractor_company ? {
              id: (incident as any).contractor_company.id,
              company_name: (incident as any).contractor_company.company_name,
            } : null,
          }}
        />
      )}

      {/* HSSE Enforcement Banner */}
      {(incident as any).hsse_enforced_at && (
        <HSSEEnforcementBanner
          enforcedAt={(incident as any).hsse_enforced_at}
          enforcedBy={(incident as any).hsse_enforced_by_profile}
          enforcementNotes={(incident as any).enforcement_notes}
        />
      )}

      {/* Workflow Approval Cards - Keep them above tabs for visibility/actionability */}
      {incident.event_type === 'observation' && (
        <>
          <HSSEValidationCard incident={incident} onComplete={() => window.location.reload()} />
          <HSSEObservationValidationCard incident={incident} onComplete={() => window.location.reload()} />
          <ObservationClosureGate incident={incident} onComplete={() => window.location.reload()} />
          <HSSEExpertRejectionReviewCard incident={incident} onComplete={() => window.location.reload()} />
        </>
      )}

      {incident.related_contractor_company_id && !(incident as any).consultant_assigned_id && (
        <>
          <DeptManagerViolationApprovalCard incident={incident} onComplete={() => window.location.reload()} />
          <ContractControllerApprovalCard incident={incident} onComplete={() => window.location.reload()} />
          <ContractorSiteRepAcknowledgeCard incident={incident} onComplete={() => window.location.reload()} />
          <HSSEViolationReviewCard incident={incident} onComplete={() => window.location.reload()} />
        </>
      )}

      {/* Main Content Layout */}
      <IncidentDetailsLayout incident={incident} currentOwner={currentOwner} isPrinting={isPrinting} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('incidents.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('incidents.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


