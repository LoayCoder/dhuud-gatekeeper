import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  UserCheck, 
  CheckCircle2, 
  XCircle,
  Loader2,
  AlertTriangle,
  Calendar,
  MapPin,
  User,
  Edit3,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeptManagerIncidentApproval, useCanApproveDeptManager } from "@/hooks/use-dept-manager-incident-approval";
import type { IncidentWithDetails } from '@/features/incidents';
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface DeptManagerIncidentApprovalCardProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

/**
 * Department Manager approval card for Level 3-5 incidents.
 * Allows manager to review, adjust descriptions, add notes, and approve/reject.
 */
export function DeptManagerIncidentApprovalCard({ incident, onComplete }: DeptManagerIncidentApprovalCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const dateLocale = i18n.language === 'ar' ? ar : enUS;
  
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);
  
  const { data: canApprove } = useCanApproveDeptManager(incident.id);
  const deptManagerApproval = useDeptManagerIncidentApproval();
  
  if (!canApprove) {
    return null;
  }
  
  const validateNotes = (forRejection: boolean): boolean => {
    if (forRejection && !notes.trim()) {
      setNotesError(t('workflow.deptManagerApproval.notesRequiredForRejection', 'Notes are required when rejecting'));
      return false;
    }
    if (forRejection && notes.trim().length < 10) {
      setNotesError(t('workflow.deptManagerApproval.notesMinLength', 'Notes must be at least 10 characters'));
      return false;
    }
    setNotesError(null);
    return true;
  };
  
  const handleApprove = () => {
    deptManagerApproval.mutate({
      incidentId: incident.id,
      decision: 'approved',
      notes: notes.trim() || undefined,
    }, {
      onSuccess: onComplete,
    });
  };
  
  const handleReject = () => {
    if (!validateNotes(true)) return;
    
    deptManagerApproval.mutate({
      incidentId: incident.id,
      decision: 'rejected',
      notes: notes.trim(),
    }, {
      onSuccess: onComplete,
    });
  };

  const getSeverityBadge = () => {
    const severity = incident.severity_v2 || (incident as any).severity;
    if (!severity) return null;
    
    const colorMap: Record<string, string> = {
      'level_1': 'bg-green-100 text-green-800 border-green-300',
      'level_2': 'bg-blue-100 text-blue-800 border-blue-300',
      'level_3': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'level_4': 'bg-orange-100 text-orange-800 border-orange-300',
      'level_5': 'bg-red-100 text-red-800 border-red-300',
    };
    
    return (
      <Badge variant="outline" className={colorMap[severity] || ''}>
        {String(t(`incidents.severity.${severity}`, severity))}
      </Badge>
    );
  };

  const severityLevel = incident.severity_v2 || (incident as any).severity;
  const isHighSeverity = severityLevel && ['level_4', 'level_5'].includes(severityLevel);

  return (
    <div className="space-y-4" dir={direction}>
      <Card className="border-orange-500/50 bg-orange-500/5">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg">
                {t('workflow.deptManagerApproval.title', 'Department Manager Approval')}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {getSeverityBadge()}
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                {t('workflow.deptManagerApproval.pendingAction', 'Approval Required')}
              </Badge>
            </div>
          </div>
          <CardDescription>
            {t('workflow.deptManagerApproval.description', 'Review this Level 3+ incident. You can adjust details and add notes before approving.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* High Severity Alert */}
          {isHighSeverity && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <Shield className="h-4 w-4" />
              <AlertTitle className="text-red-800">
                {t('workflow.deptManagerApproval.highSeverityAlert', 'High Severity Incident')}
              </AlertTitle>
              <AlertDescription className="text-red-700">
                {t('workflow.deptManagerApproval.highSeverityDesc', 'This is a Level 4/5 incident requiring team investigation upon approval.')}
              </AlertDescription>
            </Alert>
          )}

          {/* Manager Authority Notice */}
          <Alert variant="default" className="border-blue-200 bg-blue-50">
            <Edit3 className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">
              {t('workflow.deptManagerApproval.managerAuthority', 'Manager Authority')}
            </AlertTitle>
            <AlertDescription className="text-blue-700">
              {t('workflow.deptManagerApproval.managerAuthorityDesc', 'You can add notes with any adjustments or additional details. After approval, the incident proceeds to HSSE Expert for investigator assignment.')}
            </AlertDescription>
          </Alert>

          {/* Incident Summary */}
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
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(incident.occurred_at), 'PPP', { locale: dateLocale })}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {incident.site?.name || 
                   incident.branch?.name || 
                   incident.location || 
                   t('incidents.noLocationCaptured', 'No location captured')}
                </span>
              </div>
              
              {incident.reporter && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>
                    {t('workflow.deptManagerApproval.reportedBy', 'Reported by')}: {incident.reporter.full_name}
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
                    <span>{t('workflow.deptManagerApproval.hasInjury', 'Injury reported - will route to clinic for review')}</span>
                  </div>
                )}
                {incident.has_damage && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{t('workflow.deptManagerApproval.hasDamage', 'Property damage reported')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Manager Notes */}
          <div className="space-y-2">
            <Label htmlFor="dept-manager-notes" className="text-foreground">
              {t('workflow.deptManagerApproval.notes', 'Manager Notes')}
              <span className="text-muted-foreground font-normal ms-1">
                ({t('common.optional', 'Optional for approval')})
              </span>
            </Label>
            <Textarea
              id="dept-manager-notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (notesError) setNotesError(null);
              }}
              placeholder={t('workflow.deptManagerApproval.notesPlaceholder', 'Add any adjustments, clarifications, or instructions for the investigation team...')}
              rows={4}
              className={notesError ? 'border-destructive' : ''}
            />
            {notesError && (
              <p className="text-sm text-destructive">{notesError}</p>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleReject}
              disabled={deptManagerApproval.isPending}
            >
              {deptManagerApproval.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {t('workflow.deptManagerApproval.reject', 'Reject to HSSE Escalation')}
            </Button>
            
            <Button
              className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700"
              onClick={handleApprove}
              disabled={deptManagerApproval.isPending}
            >
              {deptManagerApproval.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t('workflow.deptManagerApproval.approve', 'Approve & Forward to HSSE')}
            </Button>
          </div>
          
          {/* Decision Flow Info */}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3 space-y-1">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-600" />
              <span>
                {t('workflow.deptManagerApproval.approveInfo', 'Approve: Incident proceeds to HSSE Expert for investigator assignment.')}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <XCircle className="h-3 w-3 mt-0.5 text-destructive" />
              <span>
                {t('workflow.deptManagerApproval.rejectInfo', 'Reject: Escalates to HSSE Manager for review.')}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

