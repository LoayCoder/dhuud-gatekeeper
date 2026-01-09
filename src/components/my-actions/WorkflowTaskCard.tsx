import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  ArrowRight, 
  Search as SearchIcon,
  AlertCircle,
  Clock,
  FileText,
  Shield,
  Users,
  Calendar,
  Truck,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { 
  MyAssignedInvestigation, 
  MyRiskAssessment, 
  MyPTWPermit, 
  MyVisitorRequest,
  MyScheduledInspection,
  MyGatePass 
} from '@/hooks/use-my-workflow-tasks';

// ============================================
// INVESTIGATION CARD
// ============================================
interface InvestigationCardProps {
  investigation: MyAssignedInvestigation;
}

export function InvestigationCard({ investigation }: InvestigationCardProps) {
  const { t } = useTranslation();
  const incident = investigation.incident;
  
  const isOverdue = investigation.target_completion_date && 
    new Date(investigation.target_completion_date) < new Date();

  return (
    <Card className={cn("hover:shadow-md transition-shadow", isOverdue && "border-destructive/50")}>
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <SearchIcon className="h-3 w-3" />
              {t('workflow.investigation', 'Investigation')}
            </Badge>
            {incident?.severity_v2 && (
              <Badge variant={incident.severity_v2.includes('4') || incident.severity_v2.includes('5') ? 'destructive' : 'outline'}>
                {String(t(`incidents.severity.${incident.severity_v2}`, incident.severity_v2))}
              </Badge>
            )}
            {isOverdue && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t('common.overdue', 'Overdue')}
              </Badge>
            )}
          </div>
          
          <div className="flex items-start gap-2">
            <SearchIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              {incident?.reference_id && (
                <Badge variant="outline" className="font-mono text-xs mb-1.5">
                  {incident.reference_id}
                </Badge>
              )}
              <CardTitle className="text-base line-clamp-2">{incident?.title || t('common.untitled', 'Untitled')}</CardTitle>
              {incident?.site?.name && (
                <CardDescription className="mt-1">{incident.site.name}</CardDescription>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {investigation.target_completion_date && (
            <div>
              <span className="font-medium">{t('workflow.targetDate', 'Target')}:</span>{' '}
              {new Date(investigation.target_completion_date).toLocaleDateString()}
            </div>
          )}
          {investigation.assigned_at && (
            <div>
              <span className="font-medium">{t('common.assigned', 'Assigned')}:</span>{' '}
              {formatDistanceToNow(new Date(investigation.assigned_at), { addSuffix: true })}
            </div>
          )}
        </div>
        
        <Button asChild size="sm">
          <Link to={`/incidents/investigate?incident=${investigation.incident_id}&from=my-actions`} className="gap-2">
            {t('workflow.continueInvestigation', 'Continue Investigation')}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// RISK ASSESSMENT CARD
// ============================================
interface RiskAssessmentCardProps {
  assessment: MyRiskAssessment;
}

export function RiskAssessmentCard({ assessment }: RiskAssessmentCardProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'pending_approval': return 'outline';
      case 'revision_required': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {t('workflow.riskAssessment', 'Risk Assessment')}
            </Badge>
            {assessment.status && (
              <Badge variant={getStatusVariant(assessment.status)}>
                {String(t(`riskAssessment.status.${assessment.status}`, assessment.status))}
              </Badge>
            )}
            {assessment.overall_risk_rating && (
              <Badge variant={assessment.overall_risk_rating === 'high' ? 'destructive' : 'outline'}>
                {String(t(`riskAssessment.rating.${assessment.overall_risk_rating}`, assessment.overall_risk_rating))}
              </Badge>
            )}
          </div>
          
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              {assessment.assessment_number && (
                <Badge variant="outline" className="font-mono text-xs mb-1.5">
                  {assessment.assessment_number}
                </Badge>
              )}
              <CardTitle className="text-base line-clamp-2">
                {isArabic ? assessment.activity_name_ar || assessment.activity_name : assessment.activity_name}
              </CardTitle>
              {assessment.contractor?.company_name && (
                <CardDescription className="mt-1">{assessment.contractor.company_name}</CardDescription>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {assessment.valid_until && (
            <div>
              <span className="font-medium">{t('workflow.validUntil', 'Valid Until')}:</span>{' '}
              {new Date(assessment.valid_until).toLocaleDateString()}
            </div>
          )}
          {assessment.created_at && (
            <div>
              <span className="font-medium">{t('common.created', 'Created')}:</span>{' '}
              {formatDistanceToNow(new Date(assessment.created_at), { addSuffix: true })}
            </div>
          )}
        </div>
        
        <Button asChild size="sm" variant="outline">
          <Link to={`/risk-assessments/${assessment.id}`} className="gap-2">
            {t('common.viewDetails', 'View Details')}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// PTW PERMIT CARD
// ============================================
interface PTWPermitCardProps {
  permit: MyPTWPermit;
}

export function PTWPermitCard({ permit }: PTWPermitCardProps) {
  const { t } = useTranslation();
  
  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'active': return 'default';
      case 'issued': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" />
              {t('workflow.ptwPermit', 'PTW Permit')}
            </Badge>
            {permit.status && (
              <Badge variant={getStatusVariant(permit.status)}>
                {String(t(`ptw.status.${permit.status}`, permit.status))}
              </Badge>
            )}
          </div>
          
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-info shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              {permit.reference_id && (
                <Badge variant="outline" className="font-mono text-xs mb-1.5">
                  {permit.reference_id}
                </Badge>
              )}
              <CardTitle className="text-base line-clamp-2">
                {permit.job_description || permit.work_scope || t('common.untitled', 'Untitled')}
              </CardTitle>
              {permit.site?.name && (
                <CardDescription className="mt-1">{permit.site.name}</CardDescription>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {permit.planned_start_time && (
            <div>
              <span className="font-medium">{t('workflow.startTime', 'Start')}:</span>{' '}
              {new Date(permit.planned_start_time).toLocaleString()}
            </div>
          )}
          {permit.planned_end_time && (
            <div>
              <span className="font-medium">{t('workflow.endTime', 'End')}:</span>{' '}
              {new Date(permit.planned_end_time).toLocaleString()}
            </div>
          )}
        </div>
        
        <Button asChild size="sm" variant="outline">
          <Link to={`/ptw/permits/${permit.id}`} className="gap-2">
            {t('common.viewDetails', 'View Details')}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// VISITOR REQUEST CARD
// ============================================
interface VisitorRequestCardProps {
  request: MyVisitorRequest;
}

export function VisitorRequestCard({ request }: VisitorRequestCardProps) {
  const { t } = useTranslation();
  
  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'approved': return 'default';
      case 'checked_in': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {t('workflow.visitorRequest', 'Visitor Request')}
            </Badge>
            {request.status && (
              <Badge variant={getStatusVariant(request.status)}>
                {String(t(`visitors.status.${request.status}`, request.status))}
              </Badge>
            )}
          </div>
          
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 text-success shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base line-clamp-2">
                {request.visitor?.full_name || t('common.unknown', 'Unknown Visitor')}
              </CardTitle>
              {request.visitor?.company_name && (
                <CardDescription className="mt-1">{request.visitor.company_name}</CardDescription>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {request.valid_from && (
            <div>
              <span className="font-medium">{t('workflow.validFrom', 'From')}:</span>{' '}
              {new Date(request.valid_from).toLocaleString()}
            </div>
          )}
          {request.valid_until && (
            <div>
              <span className="font-medium">{t('workflow.validUntil', 'Until')}:</span>{' '}
              {new Date(request.valid_until).toLocaleString()}
            </div>
          )}
        </div>
        
        <Button asChild size="sm" variant="outline">
          <Link to={`/visitors/requests/${request.id}`} className="gap-2">
            {t('common.viewDetails', 'View Details')}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// SCHEDULED INSPECTION CARD
// ============================================
interface ScheduledInspectionCardProps {
  schedule: MyScheduledInspection;
}

export function ScheduledInspectionCard({ schedule }: ScheduledInspectionCardProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = schedule.next_due && schedule.next_due < today;
  const isDueToday = schedule.next_due === today;

  return (
    <Card className={cn("hover:shadow-md transition-shadow", isOverdue && "border-destructive/50")}>
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Calendar className="h-3 w-3" />
              {t('workflow.scheduledInspection', 'Scheduled Inspection')}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t('common.overdue', 'Overdue')}
              </Badge>
            )}
            {isDueToday && !isOverdue && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                {t('common.dueToday', 'Due Today')}
              </Badge>
            )}
          </div>
          
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-info shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              {schedule.reference_id && (
                <Badge variant="outline" className="font-mono text-xs mb-1.5">
                  {schedule.reference_id}
                </Badge>
              )}
              <CardTitle className="text-base line-clamp-2">
                {isArabic ? schedule.name_ar || schedule.name : schedule.name}
              </CardTitle>
              {schedule.template && (
                <CardDescription className="mt-1">
                  {isArabic ? schedule.template.name_ar || schedule.template.name : schedule.template.name}
                </CardDescription>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {schedule.next_due && (
            <div className={cn(isOverdue && "text-destructive font-medium")}>
              <span className="font-medium">{t('workflow.nextDue', 'Next Due')}:</span>{' '}
              {new Date(schedule.next_due).toLocaleDateString()}
            </div>
          )}
          {schedule.frequency_type && (
            <div>
              <span className="font-medium">{t('workflow.frequency', 'Frequency')}:</span>{' '}
              {String(t(`inspections.frequency.${schedule.frequency_type}`, schedule.frequency_type))}
            </div>
          )}
        </div>
        
        <Button asChild size="sm">
          <Link to={`/inspections/schedules/${schedule.id}/start`} className="gap-2">
            {t('workflow.startInspection', 'Start Inspection')}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// GATE PASS CARD
// ============================================
interface GatePassCardProps {
  gatePass: MyGatePass;
}

export function GatePassCard({ gatePass }: GatePassCardProps) {
  const { t } = useTranslation();
  
  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending_pm_approval':
      case 'pending_safety_approval': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Truck className="h-3 w-3" />
              {t('workflow.gatePass', 'Gate Pass')}
            </Badge>
            {gatePass.status && (
              <Badge variant={getStatusVariant(gatePass.status)}>
                {String(t(`gatePasses.status.${gatePass.status}`, gatePass.status))}
              </Badge>
            )}
            {gatePass.pass_type && (
              <Badge variant="outline">
                {String(t(`gatePasses.type.${gatePass.pass_type}`, gatePass.pass_type))}
              </Badge>
            )}
          </div>
          
          <div className="flex items-start gap-2">
            <Truck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              {gatePass.reference_number && (
                <Badge variant="outline" className="font-mono text-xs mb-1.5">
                  {gatePass.reference_number}
                </Badge>
              )}
              <CardTitle className="text-base line-clamp-2">
                {gatePass.material_description || t('common.untitled', 'Untitled')}
              </CardTitle>
              {gatePass.project?.project_name && (
                <CardDescription className="mt-1">{gatePass.project.project_name}</CardDescription>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {gatePass.pass_date && (
            <div>
              <span className="font-medium">{t('workflow.passDate', 'Date')}:</span>{' '}
              {new Date(gatePass.pass_date).toLocaleDateString()}
            </div>
          )}
          {gatePass.created_at && (
            <div>
              <span className="font-medium">{t('common.created', 'Created')}:</span>{' '}
              {formatDistanceToNow(new Date(gatePass.created_at), { addSuffix: true })}
            </div>
          )}
        </div>
        
        <Button asChild size="sm" variant="outline">
          <Link to={`/contractors/gate-passes/${gatePass.id}`} className="gap-2">
            {t('common.viewDetails', 'View Details')}
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// EMPTY STATE
// ============================================
interface WorkflowEmptyStateProps {
  type: 'investigations' | 'riskAssessments' | 'ptwPermits' | 'visitors' | 'inspections' | 'gatePasses';
}

export function WorkflowEmptyState({ type }: WorkflowEmptyStateProps) {
  const { t } = useTranslation();
  
  const config = {
    investigations: {
      icon: SearchIcon,
      title: t('workflow.empty.noInvestigations', 'No Assigned Investigations'),
      description: t('workflow.empty.noInvestigationsDesc', 'You have no investigations assigned to you.'),
    },
    riskAssessments: {
      icon: AlertCircle,
      title: t('workflow.empty.noRiskAssessments', 'No Risk Assessments'),
      description: t('workflow.empty.noRiskAssessmentsDesc', 'You have no pending risk assessments.'),
    },
    ptwPermits: {
      icon: Shield,
      title: t('workflow.empty.noPTWPermits', 'No PTW Permits'),
      description: t('workflow.empty.noPTWPermitsDesc', 'You have no active permit to work applications.'),
    },
    visitors: {
      icon: Users,
      title: t('workflow.empty.noVisitors', 'No Visitor Requests'),
      description: t('workflow.empty.noVisitorsDesc', 'You have no pending visitor requests as host.'),
    },
    inspections: {
      icon: Calendar,
      title: t('workflow.empty.noInspections', 'No Scheduled Inspections'),
      description: t('workflow.empty.noInspectionsDesc', 'You have no scheduled inspections assigned to you.'),
    },
    gatePasses: {
      icon: Truck,
      title: t('workflow.empty.noGatePasses', 'No Gate Passes'),
      description: t('workflow.empty.noGatePassesDesc', 'You have no pending gate pass requests.'),
    },
  };

  const { icon: Icon, title, description } = config[type];

  return (
    <Card className="py-12">
      <CardContent className="flex flex-col items-center justify-center text-center">
        <Icon className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
