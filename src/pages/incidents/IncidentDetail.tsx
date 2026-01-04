import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Calendar, Building, Building2, MapPin, ExternalLink, Tag } from 'lucide-react';
import { IncidentAttachmentsSection } from '@/components/incidents/IncidentAttachmentsSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { useIncident, useDeleteIncident } from '@/hooks/use-incidents';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useState } from 'react';
import { generateIncidentReportPDF } from '@/lib/generate-incident-report-pdf';
import { toast } from 'sonner';
import { getSubtypeTranslation } from '@/lib/hsse-translation-utils';
import { HSSEValidationCard } from '@/components/investigation/HSSEValidationCard';
import { ObservationClosureGate } from '@/components/investigation/ObservationClosureGate';
import { HSSEExpertRejectionReviewCard } from '@/components/investigation/HSSEExpertRejectionReviewCard';
import { ContractorViolationSection } from '@/components/investigation/ContractorViolationSection';
import { DeptManagerViolationApprovalCard } from '@/components/investigation/DeptManagerViolationApprovalCard';
import { ContractControllerApprovalCard } from '@/components/investigation/ContractControllerApprovalCard';
import { ContractorSiteRepAcknowledgeCard } from '@/components/investigation/ContractorSiteRepAcknowledgeCard';
import { HSSEViolationReviewCard } from '@/components/investigation/HSSEViolationReviewCard';
import { EscalationAlertBanner } from '@/components/investigation/EscalationAlertBanner';
import { HSSEObservationValidationCard } from '@/components/investigation/HSSEObservationValidationCard';
import { useQuery } from '@tanstack/react-query';
import {
  IncidentDetailHeader,
  IncidentRiskPanel,
  IncidentWorkflowCard,
  IncidentInjuryCard,
  IncidentDamageCard,
  IncidentInfoSidebar,
} from '@/components/incidents/detail';

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

  // Fetch investigation data for current owner display
  const { data: investigation } = useQuery({
    queryKey: ['investigation-owner', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase
        .from('investigations')
        .select('investigator_id, investigator:profiles!investigator_id(full_name)')
        .eq('incident_id', id)
        .maybeSingle();
      return data;
    },
    enabled: !!id
  });

  // Get current owner based on incident status
  const getCurrentOwner = () => {
    if (!incident) return null;
    const status = incident.status as string;
    
    if (status === 'submitted' || status === 'pending_review' || status === 'expert_screening') {
      return { role: t('incidents.workflowOwners.hsse_expert', 'HSSE Expert'), name: null };
    }
    if (status === 'pending_manager_approval' || status === 'hsse_manager_escalation') {
      return { role: t('incidents.workflowOwners.department_manager', 'Department Manager'), name: null };
    }
    if (status === 'pending_dept_rep_approval') {
      return { role: t('incidents.workflowOwners.department_rep', 'Department Representative'), name: null };
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
    if (status === 'closed' || status === 'no_investigation_required' || status === 'investigation_closed') {
      return null;
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
          potential_severity_v2: (incident as any).potential_severity_v2,
          branch: incident.branch,
          site: incident.site,
          location: incident.location,
          occurred_at: incident.occurred_at,
        }}
        backPath={backPath}
        isAdmin={isAdmin}
        isPrinting={isPrinting}
        onPrint={handlePrintReport}
        onDelete={() => setDeleteDialogOpen(true)}
      />

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

      {/* Workflow Approval Cards */}
      {incident.event_type === 'observation' && (
        <>
          <HSSEValidationCard incident={incident} onComplete={() => window.location.reload()} />
          <HSSEObservationValidationCard incident={incident} onComplete={() => window.location.reload()} />
          <ObservationClosureGate incident={incident} onComplete={() => window.location.reload()} />
          <HSSEExpertRejectionReviewCard incident={incident} onComplete={() => window.location.reload()} />
        </>
      )}

      {/* Contractor Violation Approval Cards */}
      {incident.related_contractor_company_id && (
        <>
          <DeptManagerViolationApprovalCard incident={incident} onComplete={() => window.location.reload()} />
          <ContractControllerApprovalCard incident={incident} onComplete={() => window.location.reload()} />
          <ContractorSiteRepAcknowledgeCard incident={incident} onComplete={() => window.location.reload()} />
          <HSSEViolationReviewCard incident={incident} onComplete={() => window.location.reload()} />
        </>
      )}

      {/* Contractor Violation Section (Read-only display when finalized) */}
      {incident.related_contractor_company_id && (incident as any).violation_final_status && (
        <ContractorViolationSection incident={incident} isEditable={false} />
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Risk Assessment Panel */}
          <IncidentRiskPanel
            actualSeverity={incident.severity_v2}
            potentialSeverity={(incident as any).potential_severity_v2}
            eventType={incident.event_type}
          />

          {/* Description Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('incidents.description')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {incident.description}
              </p>
            </CardContent>
          </Card>

          {/* Immediate Actions */}
          {incident.immediate_actions && (
            <Card>
              <CardHeader>
                <CardTitle>{t('incidents.immediateActions')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{incident.immediate_actions}</p>
              </CardContent>
            </Card>
          )}

          {/* Classification Card */}
          {incident.event_type === 'incident' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  {t('incidents.classification', 'Classification')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('incidents.incidentCategory', 'Incident Category')}
                  </p>
                  <p className="font-medium">
                    {(incident as any).incident_type 
                      ? String(t(`incidents.hsseEventTypes.${(incident as any).incident_type}`, (incident as any).incident_type))
                      : incident.subtype
                        ? String(t(`incidents.incidentTypes.${incident.subtype}`, incident.subtype))
                        : '—'
                    }
                  </p>
                </div>
                {incident.subtype && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {t('incidents.incidentSubCategory', 'Sub Category')}
                    </p>
                    <p className="font-medium">
                      {getSubtypeTranslation(t, incident.event_type, incident.subtype, (incident as any).incident_type)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Location Details Card */}
          {(incident.location || incident.branch || incident.site || (incident.latitude && incident.longitude)) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  {t('incidents.locationDetails')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {incident.branch && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('incidents.branch')}</p>
                      <p className="font-medium">{incident.branch.name}</p>
                    </div>
                  )}
                  {incident.site && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('incidents.site')}</p>
                      <p className="font-medium">{incident.site.name}</p>
                    </div>
                  )}
                  {incident.department_info && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('incidents.responsibleDepartment')}</p>
                      <p className="font-medium">{incident.department_info.name}</p>
                    </div>
                  )}
                  {incident.location && (
                    <div className="sm:col-span-2">
                      <p className="text-sm text-muted-foreground">{t('incidents.location')}</p>
                      <p className="font-medium">{incident.location}</p>
                    </div>
                  )}
                </div>

                {/* GPS Coordinates */}
                {incident.latitude && incident.longitude && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono">
                        {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
                      </span>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a 
                        href={`https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="gap-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t('incidents.viewOnMap')}
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Injury & Damage Cards */}
          <IncidentInjuryCard
            hasInjury={incident.has_injury || false}
            injuryDetails={incident.injury_details as any}
            injuryClassification={(incident as any).injury_classification}
          />
          
          <IncidentDamageCard
            hasDamage={incident.has_damage || false}
            damageDetails={incident.damage_details as any}
          />

          {/* Special Event Linkage */}
          {incident.special_event && (
            <Card className="border-primary/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('incidents.linkedEvent')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">{incident.special_event.name}</Badge>
              </CardContent>
            </Card>
          )}

          {/* Report Against Contractor */}
          {incident.related_contractor_company && (
            <Card className="border-amber-500/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-amber-600 dark:text-amber-500">
                  <Building2 className="h-4 w-4" />
                  {t('quickObservation.reportAgainstContractor', 'Report Against Contractor')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary" className="text-sm">
                  {incident.related_contractor_company.company_name}
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Attachments Section */}
          <Card>
            <CardContent className="pt-6">
              <IncidentAttachmentsSection 
                incidentId={id!}
                mediaAttachments={mediaAttachments}
                incidentMetadata={{
                  referenceId: incident.reference_id,
                  occurredAt: incident.occurred_at,
                  location: incident.location || undefined,
                  branchName: incident.branch?.name,
                  siteName: incident.site?.name,
                  contractorName: incident.related_contractor_company?.company_name,
                  organizationName: tenantInfo?.name,
                  latitude: incident.latitude,
                  longitude: incident.longitude,
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Workflow Status Card */}
          <IncidentWorkflowCard
            status={incident.status}
            eventType={incident.event_type}
            assignedTo={currentOwner ? (currentOwner.name ? `${currentOwner.name} (${currentOwner.role})` : currentOwner.role) : undefined}
          />

          {/* Info Sidebar */}
          <IncidentInfoSidebar incident={incident} />
        </div>
      </div>

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
