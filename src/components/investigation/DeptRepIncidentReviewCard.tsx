import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  FileSearch, 
  CheckCircle2, 
  XCircle,
  Loader2,
  AlertTriangle,
  Calendar,
  MapPin,
  User,
  Info
} from "lucide-react";
import { useDeptRepIncidentReview, useCanReviewDeptRepIncident } from "@/hooks/use-dept-rep-incident-review";
import type { IncidentWithDetails } from "@/hooks/use-incidents";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface DeptRepIncidentReviewCardProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

export function DeptRepIncidentReviewCard({ incident, onComplete }: DeptRepIncidentReviewCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const dateLocale = i18n.language === 'ar' ? ar : enUS;
  
  const [justification, setJustification] = useState("");
  const [justificationError, setJustificationError] = useState<string | null>(null);
  
  const { data: canReview } = useCanReviewDeptRepIncident(incident.id);
  const deptRepReview = useDeptRepIncidentReview();
  
  if (!canReview) {
    return null;
  }
  
  const validateJustification = (): boolean => {
    if (!justification.trim()) {
      setJustificationError(t('workflow.deptRepIncidentReview.justificationRequired', 'Justification is required'));
      return false;
    }
    if (justification.trim().length < 10) {
      setJustificationError(t('workflow.deptRepIncidentReview.justificationMinLength', 'Justification must be at least 10 characters'));
      return false;
    }
    setJustificationError(null);
    return true;
  };
  
  const handleApprove = () => {
    if (!validateJustification()) return;
    
    deptRepReview.mutate({
      incidentId: incident.id,
      decision: 'approved',
      justification: justification.trim(),
    }, {
      onSuccess: onComplete,
    });
  };
  
  const handleReject = () => {
    if (!validateJustification()) return;
    
    deptRepReview.mutate({
      incidentId: incident.id,
      decision: 'rejected',
      justification: justification.trim(),
    }, {
      onSuccess: onComplete,
    });
  };

  const getSeverityBadge = () => {
    const severity = incident.severity_v2 || incident.severity;
    if (!severity) return null;
    
    const colorMap: Record<string, string> = {
      'level_1': 'bg-green-100 text-green-800 border-green-300',
      'level_2': 'bg-blue-100 text-blue-800 border-blue-300',
      'level_3': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'level_4': 'bg-orange-100 text-orange-800 border-orange-300',
      'level_5': 'bg-red-100 text-red-800 border-red-300',
      'low': 'bg-green-100 text-green-800 border-green-300',
      'medium': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'high': 'bg-orange-100 text-orange-800 border-orange-300',
      'critical': 'bg-red-100 text-red-800 border-red-300',
    };
    
    return (
      <Badge variant="outline" className={colorMap[severity] || ''}>
        {t(`incidents.severity.${severity}`, severity)}
      </Badge>
    );
  };

  return (
    <div className="space-y-4" dir={direction}>
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg">
                {t('workflow.deptRepIncidentReview.title', 'Department Representative Incident Review')}
              </CardTitle>
            </div>
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              {t('workflow.deptRepIncidentReview.pendingAction', 'Review Required')}
            </Badge>
          </div>
          <CardDescription>
            {t('workflow.deptRepIncidentReview.description', 'Review this incident and provide your decision with justification. You cannot modify incident details.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Read-Only Notice */}
          <Alert variant="default" className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">
              {t('workflow.deptRepIncidentReview.readOnlyNotice', 'Read-Only Review')}
            </AlertTitle>
            <AlertDescription className="text-blue-700">
              {t('workflow.deptRepIncidentReview.readOnlyDescription', 'You can only approve or reject this incident. Modifications are not allowed at this stage.')}
            </AlertDescription>
          </Alert>

          {/* Incident Summary - Read Only */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono font-medium">{incident.reference_id}</span>
                <Badge variant="secondary">{incident.event_type}</Badge>
                {incident.subtype && (
                  <Badge variant="outline">{incident.subtype}</Badge>
                )}
              </div>
              {getSeverityBadge()}
            </div>
            
            <h4 className="font-semibold text-foreground">{incident.title}</h4>
            
            <p className="text-sm text-muted-foreground">{incident.description}</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {incident.occurred_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 rtl:rotate-0" />
                  <span>
                    {format(new Date(incident.occurred_at), 'PPP', { locale: dateLocale })}
                  </span>
                </div>
              )}
              
              {incident.location && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{incident.location}</span>
                </div>
              )}
              
              {incident.reporter && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>
                    {t('workflow.deptRepIncidentReview.reportedBy', 'Reported by')}: {incident.reporter.full_name}
                  </span>
                </div>
              )}
            </div>
            
            {/* Injury/Damage Details */}
            {(incident.has_injury || incident.has_damage) && (
              <div className="pt-2 border-t border-border/50 space-y-2">
                {incident.has_injury && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{t('workflow.deptRepIncidentReview.hasInjury', 'Injury reported')}</span>
                  </div>
                )}
                {incident.has_damage && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{t('workflow.deptRepIncidentReview.hasDamage', 'Damage reported')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Mandatory Justification */}
          <div className="space-y-2">
            <Label htmlFor="dept-rep-justification" className="text-foreground">
              {t('workflow.deptRepIncidentReview.justification', 'Decision Justification')} *
            </Label>
            <Textarea
              id="dept-rep-justification"
              value={justification}
              onChange={(e) => {
                setJustification(e.target.value);
                if (justificationError) setJustificationError(null);
              }}
              placeholder={t('workflow.deptRepIncidentReview.justificationPlaceholder', 'Provide detailed justification for your decision (minimum 10 characters)...')}
              rows={4}
              className={justificationError ? 'border-destructive' : ''}
            />
            {justificationError && (
              <p className="text-sm text-destructive">{justificationError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('workflow.deptRepIncidentReview.justificationNote', 'Justification is mandatory for both approval and rejection.')}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleReject}
              disabled={deptRepReview.isPending}
            >
              {deptRepReview.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {t('workflow.deptRepIncidentReview.reject', 'Reject Incident')}
            </Button>
            
            <Button
              className="flex-1 flex items-center justify-center gap-2"
              onClick={handleApprove}
              disabled={deptRepReview.isPending}
            >
              {deptRepReview.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t('workflow.deptRepIncidentReview.approve', 'Approve Incident')}
            </Button>
          </div>
          
          {/* Decision Flow Info */}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3 space-y-1">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-600" />
              <span>
                {t('workflow.deptRepIncidentReview.approveInfo', 'Approve: Incident will be sent to Department Manager for final approval.')}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <XCircle className="h-3 w-3 mt-0.5 text-destructive" />
              <span>
                {t('workflow.deptRepIncidentReview.rejectInfo', 'Reject: Incident will be escalated to HSSE Manager for review.')}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
