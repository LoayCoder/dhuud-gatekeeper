import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useApproveSeverityChange, type PendingSeverityApproval } from '@/hooks/use-pending-approvals';
import { getSeverityBadgeVariant } from '@/lib/hsse-severity-levels';

interface SeverityApprovalCardProps {
  incident: PendingSeverityApproval;
}

export function SeverityApprovalCard({ incident }: SeverityApprovalCardProps) {
  const { t } = useTranslation();
  const approveSeverity = useApproveSeverityChange();

  const handleApprove = () => {
    approveSeverity.mutate({ incidentId: incident.id, approved: true });
  };

  const handleReject = () => {
    approveSeverity.mutate({ incidentId: incident.id, approved: false });
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-amber-200 dark:border-amber-900">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">{incident.title}</CardTitle>
          </div>
          <Badge variant="secondary">{incident.reference_id}</Badge>
        </div>
        <CardDescription>
          {t('investigation.approvals.severityChangeRequest', 'Severity change request pending approval')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Severity Change Visualization */}
        <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t('investigation.from', 'From')}:</span>
            <Badge variant={getSeverityBadgeVariant(incident.original_severity_v2)}>
              {incident.original_severity_v2 ? t(`severity.${incident.original_severity_v2}.label`) : 'N/A'}
            </Badge>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t('investigation.to', 'To')}:</span>
            <Badge variant={getSeverityBadgeVariant(incident.severity_v2)}>
              {incident.severity_v2 ? t(`severity.${incident.severity_v2}.label`) : 'N/A'}
            </Badge>
          </div>
        </div>

        {/* Justification */}
        {incident.severity_change_justification && (
          <div className="space-y-1">
            <span className="text-sm font-medium">{t('investigation.justification', 'Justification')}:</span>
            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
              {incident.severity_change_justification}
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
            disabled={approveSeverity.isPending}
          >
            <XCircle className="h-4 w-4 me-2" />
            {t('investigation.approvals.rejectChange', 'Reject')}
          </Button>
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={approveSeverity.isPending}
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
