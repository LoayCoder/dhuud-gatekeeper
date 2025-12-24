import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  ClipboardCheck, 
  RotateCcw, 
  XCircle, 
  FileX,
  ArrowRight,
  ClipboardList,
  Loader2
} from "lucide-react";
import { ReturnToReporterDialog } from "./ReturnToReporterDialog";
import { RejectReportDialog } from "./RejectReportDialog";
import { NoInvestigationDialog } from "./NoInvestigationDialog";
import { 
  useExpertScreening, 
  useCanPerformExpertScreening,
  useIncidentDepartmentManager 
} from "@/hooks/use-hsse-workflow";
import type { IncidentWithDetails } from "@/hooks/use-incidents";

interface HSSEExpertScreeningCardProps {
  incident: IncidentWithDetails;
  onComplete: () => void;
}

export function HSSEExpertScreeningCard({ incident, onComplete }: HSSEExpertScreeningCardProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [notes, setNotes] = useState("");
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showNoInvestigationDialog, setShowNoInvestigationDialog] = useState(false);
  
  const { data: canScreen } = useCanPerformExpertScreening();
  const { data: departmentManager, isLoading: loadingManager } = useIncidentDepartmentManager(incident.id);
  const expertScreening = useExpertScreening();
  
  if (!canScreen) {
    return null;
  }
  
  const handleRecommendInvestigation = () => {
    expertScreening.mutate({
      incidentId: incident.id,
      recommendation: 'investigate',
      notes,
    }, {
      onSuccess: onComplete,
    });
  };
  
  const handleReturn = (reason: string, instructions: string) => {
    expertScreening.mutate({
      incidentId: incident.id,
      recommendation: 'return',
      notes,
      returnReason: reason,
      returnInstructions: instructions,
    }, {
      onSuccess: () => {
        setShowReturnDialog(false);
        onComplete();
      },
    });
  };
  
  const handleReject = (reason: string) => {
    expertScreening.mutate({
      incidentId: incident.id,
      recommendation: 'reject',
      notes,
      rejectionReason: reason,
    }, {
      onSuccess: () => {
        setShowRejectDialog(false);
        onComplete();
      },
    });
  };
  
  const handleNoInvestigation = (justification: string) => {
    expertScreening.mutate({
      incidentId: incident.id,
      recommendation: 'no_investigation',
      notes,
      noInvestigationJustification: justification,
    }, {
      onSuccess: () => {
        setShowNoInvestigationDialog(false);
        onComplete();
      },
    });
  };
  
  // Handler for assigning actions (observation workflow)
  const handleAssignActions = () => {
    expertScreening.mutate({
      incidentId: incident.id,
      recommendation: 'assign_actions',
      notes,
    }, {
      onSuccess: onComplete,
    });
  };
  
  // Check if this is an observation
  const isObservation = incident.event_type === 'observation';

  return (
    <>
      <Card className="border-primary/50 bg-primary/5" dir={direction}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t('workflow.expertScreening.title', 'HSSE Expert Screening')}</CardTitle>
            </div>
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              {t('workflow.expertScreening.pendingReview', 'Pending Review')}
            </Badge>
          </div>
          <CardDescription>
            {t('workflow.expertScreening.description', 'Review the event report and decide on the appropriate action')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Screening Notes */}
          <div className="space-y-2">
            <Label htmlFor="screening-notes">
              {t('workflow.expertScreening.notes', 'Screening Notes')}
            </Label>
            <Textarea
              id="screening-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('workflow.expertScreening.notesPlaceholder', 'Add any notes about your screening decision...')}
              rows={3}
            />
          </div>
          
          {/* Department Manager Info */}
          {loadingManager ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.loading', 'Loading...')}
            </div>
          ) : departmentManager ? (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                {t('workflow.expertScreening.departmentManager', 'Department Manager')}:
              </p>
              <p className="font-medium">{departmentManager.full_name}</p>
              {departmentManager.job_title && (
                <p className="text-sm text-muted-foreground">{departmentManager.job_title}</p>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800">
                {t('workflow.expertScreening.noManager', 'No department manager found. Investigation approval will go to HSSE Manager.')}
              </p>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            {/* Top row - Return & Reject */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="flex items-center justify-center gap-2"
                onClick={() => setShowReturnDialog(true)}
                disabled={expertScreening.isPending}
              >
                <RotateCcw className="h-4 w-4 shrink-0" />
                <span className="truncate">{t('workflow.expertScreening.returnToReporter', 'Return for Correction')}</span>
              </Button>
              
              <Button
                variant="outline"
                className="flex items-center justify-center gap-2 text-destructive border-destructive/50 hover:bg-destructive/10"
                onClick={() => setShowRejectDialog(true)}
                disabled={expertScreening.isPending}
              >
                <XCircle className="h-4 w-4 shrink-0" />
                <span className="truncate">{t('workflow.expertScreening.reject', 'Reject Report')}</span>
              </Button>
            </div>
            
            {/* Bottom row - No Investigation & Main Action */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="flex items-center justify-center gap-2"
                onClick={() => setShowNoInvestigationDialog(true)}
                disabled={expertScreening.isPending}
              >
                <FileX className="h-4 w-4 shrink-0" />
                <span className="truncate">{t('workflow.expertScreening.noInvestigation', 'No Investigation Required')}</span>
              </Button>
              
              {/* Show different button based on event type */}
              {isObservation ? (
                <Button
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                  onClick={handleAssignActions}
                  disabled={expertScreening.isPending}
                >
                  {expertScreening.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <ClipboardList className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">{t('workflow.expertScreening.assignActions', 'Send for Action Assignment')}</span>
                </Button>
              ) : (
                <Button
                  className="flex items-center justify-center gap-2"
                  onClick={handleRecommendInvestigation}
                  disabled={expertScreening.isPending}
                >
                  {expertScreening.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">{t('workflow.expertScreening.recommendInvestigation', 'Recommend Investigation')}</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <ReturnToReporterDialog
        open={showReturnDialog}
        onOpenChange={setShowReturnDialog}
        onConfirm={handleReturn}
        isLoading={expertScreening.isPending}
      />
      
      <RejectReportDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        onConfirm={handleReject}
        isLoading={expertScreening.isPending}
      />
      
      <NoInvestigationDialog
        open={showNoInvestigationDialog}
        onOpenChange={setShowNoInvestigationDialog}
        onConfirm={handleNoInvestigation}
        isLoading={expertScreening.isPending}
      />
    </>
  );
}
