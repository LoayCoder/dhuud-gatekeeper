import { useTranslation } from 'react-i18next';
import { TrendingUp, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApprovePotentialSeverityChange, type PendingPotentialSeverityApproval } from '@/hooks/use-pending-approvals';
import { getSeverityBadgeVariant } from '@/lib/hsse-severity-levels';

interface PotentialSeverityApprovalCardProps {
  incident: PendingPotentialSeverityApproval;
}

export function PotentialSeverityApprovalCard({ incident }: PotentialSeverityApprovalCardProps) {
  const { t } = useTranslation();
  const approvePotentialSeverity = useApprovePotentialSeverityChange();

  const handleApprove = () => {
    approvePotentialSeverity.mutate({ incidentId: incident.id, approved: true });
  };

  const handleReject = () => {
    approvePotentialSeverity.mutate({ incidentId: incident.id, approved: false });
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-purple-200 dark:border-purple-900">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-base">{incident.title}</CardTitle>
          </div>
          <Badge variant="secondary">{incident.reference_id}</Badge>
        </div>
        <CardDescription>
          {t('investigation.potentialSeverityChangeRequest', 'Potential severity assessment pending approval')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Potential Severity Visualization */}
        <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
          {incident.original_potential_severity_v2 ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('investigation.from', 'From')}:</span>
                <Badge variant={getSeverityBadgeVariant(incident.original_potential_severity_v2)}>
                  {t(`severity.${incident.original_potential_severity_v2}.label`)}
                </Badge>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
            </>
          ) : null}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t('investigation.potentialSeverity', 'Potential Severity')}:</span>
            <Badge variant={getSeverityBadgeVariant(incident.potential_severity_v2)}>
              {incident.potential_severity_v2 ? t(`severity.${incident.potential_severity_v2}.label`) : 'N/A'}
            </Badge>
          </div>
        </div>

        {/* Justification */}
        {incident.potential_severity_justification && (
          <div className="space-y-1">
            <span className="text-sm font-medium">{t('investigation.justification', 'Justification')}:</span>
            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
              {incident.potential_severity_justification}
            </p>
          </div>
        )}

        {/* Reporter Info */}
        {incident.reporter && (
          <div className="text-sm text-muted-foreground">
            {t('investigation.reportedBy', 'Reported by')}: {incident.reporter.full_name}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReject}
            disabled={approvePotentialSeverity.isPending}
          >
            <XCircle className="h-4 w-4 me-2" />
            {t('investigation.approvals.rejectChange', 'Reject')}
          </Button>
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={approvePotentialSeverity.isPending}
          >
            <CheckCircle2 className="h-4 w-4 me-2" />
            {t('investigation.approvals.approveChange', 'Approve')}
          </Button>
          <Button asChild variant="ghost" size="sm" className="ms-auto">
            <Link to={`/incidents/${incident.id}`} className="gap-2">
              {t('investigation.viewEvent', 'View Event')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
