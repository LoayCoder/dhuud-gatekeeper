import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, AlertTriangle, CheckCircle2, Eye, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MyActionsViewProps } from '../types';

export function ApprovalsTab({ viewProps }: { viewProps: MyActionsViewProps }) {
  const { t, i18n } = useTranslation();
  const {
    pendingApprovals, pendingSeverity, pendingPotentialSeverity,
    pendingIncidentApprovals, pendingClosures, pendingExtensions,
    pendingWorkers, pendingGatePasses, pendingCompanies,
    canApproveSeverity, canVerifyActions, canApproveWorkers, canApproveGatePasses,
    canApproveClosures, isHSSEManager, totalPendingApprovals,
    selectedActionForVerification, setSelectedActionForVerification,
  } = viewProps;

  if (!totalPendingApprovals) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold text-lg">{t('investigation.approvals.noApprovals', 'No Pending Approvals')}</h3>
          <p className="text-muted-foreground text-sm">{t('investigation.approvals.noApprovalsDescription', 'There are no actions or changes awaiting your approval.')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Severity Change Approvals */}
      {canApproveSeverity && pendingSeverity?.length > 0 && (
        <ApprovalSection
          title={t('investigation.approvals.severityChanges', 'Severity Changes')}
          count={pendingSeverity.length}
        >
          {pendingSeverity.map((item: any) => (
            <ApprovalCard key={item.id} item={item} t={t} i18n={i18n}>
              <p className="text-sm">{t('investigation.approvals.severityChangeRequest', 'Severity change request pending approval')}</p>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/incidents/${item.incident_id || item.id}`}>
                  {t('investigation.approvals.reviewIncident', 'Review & Approve')}
                  <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" />
                </Link>
              </Button>
            </ApprovalCard>
          ))}
        </ApprovalSection>
      )}

      {/* Potential Severity Approvals */}
      {canApproveSeverity && pendingPotentialSeverity?.length > 0 && (
        <ApprovalSection
          title={t('investigation.approvals.potentialSeverityChanges', 'Potential Severity Assessments')}
          count={pendingPotentialSeverity.length}
        >
          {pendingPotentialSeverity.map((item: any) => (
            <ApprovalCard key={item.id} item={item} t={t} i18n={i18n}>
              <p className="text-sm">{t('investigation.approvals.potentialSeverityChangeRequest', 'Potential severity assessment pending approval')}</p>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/incidents/${item.incident_id || item.id}`}>
                  {t('investigation.approvals.reviewIncident', 'Review & Approve')}
                  <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" />
                </Link>
              </Button>
            </ApprovalCard>
          ))}
        </ApprovalSection>
      )}

      {/* Action Verifications */}
      {canVerifyActions && pendingApprovals?.length > 0 && (
        <ApprovalSection
          title={t('investigation.approvals.actionVerifications', 'Action Verifications')}
          count={pendingApprovals.length}
        >
          {pendingApprovals.map((item: any) => (
            <ApprovalCard key={item.id} item={item} t={t} i18n={i18n}>
              <p className="text-sm truncate">{item.title || item.reference_id}</p>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/incidents/${item.incident_id || item.id}`}>
                  {t('investigation.approvals.reviewAction', 'Review & Verify')}
                  <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" />
                </Link>
              </Button>
            </ApprovalCard>
          ))}
        </ApprovalSection>
      )}

      {/* Incident Approvals */}
      {pendingIncidentApprovals?.length > 0 && (
        <ApprovalSection
          title={t('investigation.approvals.incidentApprovals', 'Incident Approvals')}
          count={pendingIncidentApprovals.length}
        >
          {pendingIncidentApprovals.map((item: any) => (
            <ApprovalCard key={item.id} item={item} t={t} i18n={i18n}>
              <p className="text-sm">{item.title || item.reference_id}</p>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/incidents/${item.id}`}>
                  {t('investigation.approvals.reviewIncident', 'Review & Approve')}
                  <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" />
                </Link>
              </Button>
            </ApprovalCard>
          ))}
        </ApprovalSection>
      )}

      {/* Closure Requests */}
      {canApproveClosures && pendingClosures?.length > 0 && (
        <ApprovalSection
          title={t('investigation.closureRequests', 'Closure Requests')}
          count={pendingClosures.length}
        >
          {pendingClosures.map((item: any) => (
            <ApprovalCard key={item.id} item={item} t={t} i18n={i18n}>
              <p className="text-sm">{item.title || item.reference_id}</p>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/incidents/${item.incident_id || item.id}`}>
                  {t('investigation.approvals.reviewClosure', 'Review & Approve')}
                  <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" />
                </Link>
              </Button>
            </ApprovalCard>
          ))}
        </ApprovalSection>
      )}

      {/* Extension Requests */}
      {pendingExtensions?.length > 0 && (
        <ApprovalSection
          title={t('investigation.extensionRequests', 'Extension Requests')}
          count={pendingExtensions.length}
        >
          {pendingExtensions.map((item: any) => (
            <ApprovalCard key={item.id} item={item} t={t} i18n={i18n}>
              <p className="text-sm">{item.extension_reason || item.reference_id}</p>
              <Button size="sm" variant="outline" asChild>
                <Link to={`/incidents/${item.incident_id || item.id}`}>
                  {t('common.review', 'Review')}
                  <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" />
                </Link>
              </Button>
            </ApprovalCard>
          ))}
        </ApprovalSection>
      )}

      {/* Contractor Worker Approvals */}
      {canApproveWorkers && pendingWorkers?.length > 0 && (
        <ApprovalSection
          title={t('contractors.workerApprovals', 'Worker Approvals')}
          count={pendingWorkers.length}
        >
          {pendingWorkers.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <span className="font-medium">{item.full_name || item.name}</span>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/contractors/workers">
                    {t('common.review', 'Review')}
                    <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </ApprovalSection>
      )}

      {/* Gate Pass Approvals */}
      {canApproveGatePasses && pendingGatePasses?.length > 0 && (
        <ApprovalSection
          title={t('contractors.gatePassApprovals', 'Gate Pass Approvals')}
          count={pendingGatePasses.length}
        >
          {pendingGatePasses.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <span className="font-medium">{item.reference_id || item.id}</span>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/contractors/gate-passes">
                    {t('common.review', 'Review')}
                    <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </ApprovalSection>
      )}

      {/* Company Approvals */}
      {pendingCompanies?.length > 0 && (
        <ApprovalSection
          title={t('contractors.companyApprovals', 'Company Approvals')}
          count={pendingCompanies.length}
        >
          {pendingCompanies.map((item: any) => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <span className="font-medium">{item.name || item.company_name}</span>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/contractors/companies">
                    {t('common.review', 'Review')}
                    <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </ApprovalSection>
      )}
    </div>
  );
}

function ApprovalSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-sm">{title}</h3>
        <Badge variant="secondary">{count}</Badge>
      </div>
      {children}
    </div>
  );
}

function ApprovalCard({ item, t, i18n, children }: { item: any; t: any; i18n: any; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
