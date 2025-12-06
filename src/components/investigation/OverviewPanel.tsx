import { useTranslation } from "react-i18next";
import { ReporterInfoCard } from "./ReporterInfoCard";
import { IncidentInfoCard } from "./IncidentInfoCard";
import { InvestigatorAssignmentCard } from "./InvestigatorAssignmentCard";
import { SeverityAdjustmentCard } from "./SeverityAdjustmentCard";
import { ApprovalWorkflowBanner } from "./ApprovalWorkflowBanner";
import type { IncidentWithDetails } from "@/hooks/use-incidents";
import type { Investigation } from "@/hooks/use-investigation";

interface OverviewPanelProps {
  incident: IncidentWithDetails;
  investigation: Investigation | null;
  onRefresh: () => void;
}

export function OverviewPanel({ incident, investigation, onRefresh }: OverviewPanelProps) {
  const { i18n } = useTranslation();
  const direction = i18n.dir();
  
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
        
        {/* Investigator Assignment (only if has HSSE access) */}
        <InvestigatorAssignmentCard 
          incident={incident}
          investigation={investigation}
          onRefresh={onRefresh}
        />
      </div>

      {/* Incident Information - Full width, read-only when locked */}
      <IncidentInfoCard incident={incident} isLocked={isLocked} />

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
