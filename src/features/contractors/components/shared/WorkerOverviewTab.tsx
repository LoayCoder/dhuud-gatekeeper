import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ContractorWorker } from "@/features/contractors/hooks/use-contractor-workers/types";
import { WorkerComplianceFlags } from "./WorkerComplianceFlags";
import { WorkerProfileHeader } from "./WorkerProfileHeader";
import { WorkerPersonalInfoCard } from "./WorkerPersonalInfoCard";
import { WorkerEmergencyContactCard } from "./WorkerEmergencyContactCard";
import { WorkerFitnessCard } from "./WorkerFitnessCard";
import { WorkerCertificationsCard } from "./WorkerCertificationsCard";
import { WorkerProjectCard } from "./WorkerProjectCard";

interface WorkerOverviewTabProps {
  worker: ContractorWorker;
  photoUrl?: string | null;
  showProject?: boolean;
}

export function WorkerOverviewTab({ worker, photoUrl, showProject = true }: WorkerOverviewTabProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <WorkerComplianceFlags worker={worker} t={t} />
      <WorkerProfileHeader worker={worker} photoUrl={photoUrl} />
      <WorkerPersonalInfoCard worker={worker} />
      <WorkerEmergencyContactCard worker={worker} />
      <WorkerFitnessCard worker={worker} />
      {showProject && <WorkerProjectCard workerId={worker.id} />}
      <WorkerCertificationsCard worker={worker} />

      {worker.rejection_reason && (
        <Card className="border-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive">
              {t("contractors.workers.rejectionReason", "Rejection Reason")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{worker.rejection_reason}</p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        {t("common.submitted", "Submitted")}: {format(new Date(worker.created_at), "PPp")}
      </p>
    </div>
  );
}
