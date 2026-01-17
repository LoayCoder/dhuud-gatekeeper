import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  HeartPulse, 
  CheckCircle2, 
  Loader2,
  AlertTriangle,
  Calendar,
  User,
  Stethoscope,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubmitClinicReview, useCanPerformClinicReview } from "@/hooks/use-clinic-review";
import type { IncidentWithDetails } from "@/hooks/use-incidents";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface ClinicReviewCardProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

/**
 * Clinic Review Card for medical staff to document injury details.
 * Displayed when incident has injuries requiring medical attention.
 */
export function ClinicReviewCard({ incident, onComplete }: ClinicReviewCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const dateLocale = i18n.language === 'ar' ? ar : enUS;
  
  const [notes, setNotes] = useState("");
  
  const { data: canReview } = useCanPerformClinicReview(incident.id);
  const submitClinicReview = useSubmitClinicReview();
  
  if (!canReview) {
    return null;
  }
  
  const handleSubmit = () => {
    submitClinicReview.mutate({
      incidentId: incident.id,
      notes: notes.trim() || undefined,
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

  return (
    <div className="space-y-4" dir={direction}>
      <Card className="border-rose-500/50 bg-rose-500/5">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-rose-600" />
              <CardTitle className="text-lg">
                {t('workflow.clinic.title', 'Clinic/Medical Review')}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {getSeverityBadge()}
              <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300">
                {t('workflow.clinic.pendingAction', 'Medical Review Required')}
              </Badge>
            </div>
          </div>
          <CardDescription>
            {t('workflow.clinic.description', 'Review and document injury details for this incident. The investigation cannot proceed until medical information is complete.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Medical Review Alert */}
          <Alert variant="default" className="border-rose-200 bg-rose-50">
            <Stethoscope className="h-4 w-4 text-rose-600" />
            <AlertTitle className="text-rose-800">
              {t('workflow.clinic.injuryReported', 'Injury Requiring Medical Attention')}
            </AlertTitle>
            <AlertDescription className="text-rose-700">
              {t('workflow.clinic.injuryReportedDesc', 'This incident involves injuries that require first aid or medical attention. Please review and document the medical details.')}
            </AlertDescription>
          </Alert>

          {/* Incident Summary */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono font-medium">{incident.reference_id}</span>
                <Badge variant="secondary">{incident.event_type}</Badge>
              </div>
            </div>
            
            <h4 className="font-semibold text-foreground">{incident.title}</h4>
            
            <p className="text-sm text-muted-foreground line-clamp-2">{incident.description}</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {incident.occurred_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(incident.occurred_at), 'PPP', { locale: dateLocale })}
                  </span>
                </div>
              )}
              
              {incident.reporter && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>
                    {t('workflow.clinic.reportedBy', 'Reported by')}: {incident.reporter.full_name}
                  </span>
                </div>
              )}
            </div>
            
            {/* Injury indicator */}
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>{t('workflow.clinic.injuryFlag', 'Injury reported requiring medical attention')}</span>
              </div>
            </div>
          </div>
          
          {/* Existing Injury Info - if available */}
          {(incident as any).injury_info && (
            <div className="rounded-lg border border-muted p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" />
                {t('workflow.clinic.reporterInjuryInfo', 'Reporter\'s Injury Description')}
              </div>
              <p className="text-sm text-muted-foreground">
                {(incident as any).injury_info || t('workflow.clinic.noInjuryInfo', 'No injury details provided by reporter')}
              </p>
            </div>
          )}
          
          {/* Clinic Notes */}
          <div className="space-y-2">
            <Label htmlFor="clinic-notes" className="text-foreground">
              {t('workflow.clinic.clinicNotes', 'Clinical Notes')}
              <span className="text-muted-foreground font-normal ms-1">
                ({t('common.optional', 'Optional')})
              </span>
            </Label>
            <Textarea
              id="clinic-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('workflow.clinic.notesPlaceholder', 'Document treatment provided, prognosis, return-to-work recommendations, or any other medical observations...')}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              {t('workflow.clinic.notesHint', 'You can also add detailed injury records in the Injury Panel after submission.')}
            </p>
          </div>
          
          {/* Submit Button */}
          <Button
            className="w-full bg-rose-600 hover:bg-rose-700"
            onClick={handleSubmit}
            disabled={submitClinicReview.isPending}
          >
            {submitClinicReview.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 me-2" />
            )}
            {t('workflow.clinic.submit', 'Complete Clinic Review')}
          </Button>
          
          {/* Info */}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
            <p className="flex items-start gap-2">
              <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-600" />
              <span>
                {t('workflow.clinic.submitInfo', 'After completing the clinic review, the incident will proceed to HSSE Expert for investigator assignment.')}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
