import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Calendar, Building, Building2, MapPin, ExternalLink, Tag, HeartPulse, Users, Crown, ArrowRight } from 'lucide-react';
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
import { getCurrentOwner as getCurrentOwnerFromLib } from '@/lib/current-owner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useState } from 'react';
import { generateIncidentReportPDF } from '@/lib/generate-incident-report-pdf';
import { toast } from 'sonner';
import { getSubtypeTranslation, snakeToCamel, getHsseEventTypeForSubtype } from '@/lib/hsse-translation-utils';
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
  const { data: incident, isLoading, refetch: refetchIncident } = useIncident(id);
  const handleRefresh = () => { refetchIncident(); };
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

  // Get current owner using centralized resolver
  const ownerInfo = getCurrentOwnerFromLib(incident as any);
  const currentOwner = ownerInfo ? { role: ownerInfo.role, name: ownerInfo.name } : null;

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
  // Extended incident fields interface for fields not in generated types
  interface IncidentExt {
    severity?: string;
    potential_severity_v2?: string;
    osha_reportable?: boolean;
    requires_escalation?: boolean;
    escalation_reason?: string;
    escalation_level?: number;
    escalation_triggered_at?: string;
    contractor_company?: { id: string; company_name: string } | null;
    hsse_enforced_at?: string;
    hsse_enforced_by_profile?: Record<string, unknown>;
    enforcement_notes?: string;
    consultant_assigned_id?: string;
  }
  const ext = incident as unknown as IncidentExt;
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
          severity: ext.severity,
          potential_severity_v2: ext.potential_severity_v2,
          branch: incident.branch,
          site: incident.site,
          location: incident.location,
          occurred_at: incident.occurred_at,
          created_at: incident.created_at,
          branch_id: incident.branch_id,
          site_id: incident.site_id,
          related_contractor_company_id: incident.related_contractor_company_id,
          approval_manager: incident.approval_manager,
          
          investigations: incident.investigations,
          related_contractor_company: incident.related_contractor_company,
        }}
        backPath={backPath}
        isAdmin={isAdmin}
        isPrinting={isPrinting}
        onPrint={handlePrintReport}
        onDelete={() => setDeleteDialogOpen(true)}
      />

      {/* C10: OSHA Reportable Banner */}
      {ext.osha_reportable && (
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
      {ext.requires_escalation && (
        <EscalationAlertBanner
          incident={{
            id: incident.id,
            requires_escalation: ext.requires_escalation,
            escalation_reason: ext.escalation_reason,
            escalation_level: ext.escalation_level,
            escalation_triggered_at: ext.escalation_triggered_at,
            related_contractor_company_id: incident.related_contractor_company_id,
            contractor_company: ext.contractor_company ? {
              id: ext.contractor_company.id,
              company_name: ext.contractor_company.company_name,
            } : null,
          }}
        />
      )}

      {/* HSSE Enforcement Banner */}
      {ext.hsse_enforced_at && (
        <HSSEEnforcementBanner
          enforcedAt={ext.hsse_enforced_at}
          enforcedBy={ext.hsse_enforced_by_profile}
          enforcementNotes={ext.enforcement_notes}
        />
      )}

      {/* Workflow Approval Cards - Keep them above tabs for visibility/actionability */}
      {incident.event_type === 'observation' && (
        <>
          <HSSEObservationValidationCard incident={incident} onComplete={handleRefresh} />
          <ObservationClosureGate incident={incident} onComplete={handleRefresh} />
          <HSSEExpertRejectionReviewCard incident={incident} onComplete={handleRefresh} />
        </>
      )}

      {incident.related_contractor_company_id && !ext.consultant_assigned_id && (
        <>
          <DeptManagerViolationApprovalCard incident={incident} onComplete={handleRefresh} />
          <ContractControllerApprovalCard incident={incident} onComplete={handleRefresh} />
          <ContractorSiteRepAcknowledgeCard incident={incident} onComplete={handleRefresh} />
          <HSSEViolationReviewCard incident={incident} onComplete={handleRefresh} />
        </>
      )}

      {/* Investigation Workspace CTA for active incidents */}
      {incident.event_type !== 'observation' && incident.status !== 'closed' && incident.status !== 'investigation_closed' && incident.status !== 'no_investigation_required' && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-foreground">{t('investigation.workspace.ctaTitle', 'Manage this incident in the Investigation Workspace')}</p>
              <p className="text-sm text-muted-foreground">{t('investigation.workspace.ctaDescription', 'Access workflow actions, approvals, and investigation tools')}</p>
            </div>
            <Button asChild variant="default" size="sm">
              <Link to={`/incidents/investigate/${incident.id}`}>
                {t('investigation.workspace.open', 'Open Workspace')}
                <ArrowRight className="h-4 w-4 ms-2 rtl:rotate-180" />
              </Link>
            </Button>
          </CardContent>
        </Card>
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


