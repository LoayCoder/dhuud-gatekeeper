import { useTranslation } from "react-i18next";
import { Loader2, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ReporterInfoCard } from "./ReporterInfoCard";
import { IncidentInfoCard } from "./IncidentInfoCard";
import { InvestigatorAssignmentCard } from "./InvestigatorAssignmentCard";
import { SeverityAdjustmentCard } from "./SeverityAdjustmentCard";
import { ApprovalWorkflowBanner } from "./ApprovalWorkflowBanner";
import { LinkedAssetsCard } from "./LinkedAssetsCard";
import type { IncidentWithDetails } from "@/hooks/use-incidents";
import type { Investigation } from "@/hooks/use-investigation";

interface OverviewPanelProps {
  incident: IncidentWithDetails | undefined;
  investigation: Investigation | null;
  onRefresh: () => void;
}

export function OverviewPanel({ incident, investigation, onRefresh }: OverviewPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  // Show loading state if incident is not yet loaded
  if (!incident) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isLocked = (incident as IncidentWithDetails & { investigation_locked?: boolean }).investigation_locked ?? false;

  return (
    <div className="space-y-6" dir={direction}>
      {/* Approval Workflow Banner */}
      <ApprovalWorkflowBanner 
        incident={incident} 
        investigation={investigation}
        onRefresh={onRefresh}
      />

      {/* Two-column layout for main info */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reporter Information */}
        <ReporterInfoCard incident={incident} />
        
        {/* Investigator Assignment - only show when status allows */}
        {['investigation_pending', 'investigation_in_progress'].includes(incident.status || '') ? (
          <InvestigatorAssignmentCard 
            incident={incident}
            investigation={investigation}
            onRefresh={onRefresh}
          />
        ) : (
          <Card className="bg-muted/50">
            <CardContent className="py-6 text-center text-muted-foreground">
              <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('investigation.overview.investigatorAwaitingApproval')}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Incident Information - Full width, read-only when locked */}
      <IncidentInfoCard incident={incident} isLocked={isLocked} />

      {/* Linked Assets Card */}
      <LinkedAssetsCard incidentId={incident.id} canEdit={!isLocked} />

      {/* Severity Adjustment - Only for investigator after assignment */}
      {investigation && (
        <SeverityAdjustmentCard 
          incident={incident}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
