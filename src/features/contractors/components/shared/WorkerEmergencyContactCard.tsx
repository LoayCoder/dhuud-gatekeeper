import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Phone } from "lucide-react";
import { ContractorWorker } from "@/features/contractors/hooks/use-contractor-workers/types";
import { WorkerInfoRow } from "./WorkerInfoRow";

interface WorkerEmergencyContactCardProps {
  worker: ContractorWorker;
}

export function WorkerEmergencyContactCard({ worker }: WorkerEmergencyContactCardProps) {
  const { t } = useTranslation();

  if (!worker.emergency_contact_name && !worker.emergency_contact_phone) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">{t("contractors.workers.emergencyContact", "Emergency Contact")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <WorkerInfoRow icon={User} label={t("common.name", "Name")} value={worker.emergency_contact_name || "-"} />
          <WorkerInfoRow icon={Phone} label={t("common.phone", "Phone")} value={worker.emergency_contact_phone || "-"} dir="ltr" />
        </div>
      </CardContent>
    </Card>
  );
}
