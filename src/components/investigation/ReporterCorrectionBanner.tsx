import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RotateCcw, Edit, Loader2 } from "lucide-react";
import { useReporterResponse } from "@/hooks/use-hsse-workflow";
import { useAuth } from "@/contexts/AuthContext";
import type { IncidentWithDetails } from "@/hooks/use-incidents";

interface ReporterCorrectionBannerProps {
  incident: IncidentWithDetails;
  onEdit: () => void;
  onComplete: () => void;
}

type ExtendedIncident = IncidentWithDetails & {
  return_reason?: string;
  return_instructions?: string;
  resubmission_count?: number;
};

export function ReporterCorrectionBanner({ incident, onEdit, onComplete }: ReporterCorrectionBannerProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { user } = useAuth();
  
  const reporterResponse = useReporterResponse();
  
  // Only show to the original reporter
  if (incident.reporter_id !== user?.id) {
    return null;
  }
  
  const extendedIncident = incident as ExtendedIncident;
  
  const handleResubmit = () => {
    reporterResponse.mutate({
      incidentId: incident.id,
      action: 'resubmit',
    }, {
      onSuccess: onComplete,
    });
  };

  return (
    <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20" dir={direction}>
      <RotateCcw className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        {t('workflow.correction.title', 'Correction Required')}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        {extendedIncident.return_reason && (
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {t('workflow.correction.reason', 'Reason')}:
            </p>
            <p className="text-amber-700 dark:text-amber-300">{extendedIncident.return_reason}</p>
          </div>
        )}
        
        {extendedIncident.return_instructions && (
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {t('workflow.correction.instructions', 'Instructions')}:
            </p>
            <p className="text-amber-700 dark:text-amber-300">{extendedIncident.return_instructions}</p>
          </div>
        )}
        
        {extendedIncident.resubmission_count && extendedIncident.resubmission_count > 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {t('workflow.correction.previousSubmissions', 'Previous submissions')}: {extendedIncident.resubmission_count}
          </p>
        )}
        
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="border-amber-500 text-amber-700 hover:bg-amber-100"
          >
            <Edit className="h-4 w-4 me-2" />
            {t('workflow.correction.edit', 'Edit Report')}
          </Button>
          <Button
            size="sm"
            onClick={handleResubmit}
            disabled={reporterResponse.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {reporterResponse.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <RotateCcw className="h-4 w-4 me-2" />
            )}
            {t('workflow.correction.resubmit', 'Resubmit')}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
