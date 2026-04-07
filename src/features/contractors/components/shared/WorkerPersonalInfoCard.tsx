import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Calendar, User, Globe, Phone, Mail } from "lucide-react";
import { format } from "date-fns";
import { ContractorWorker } from "@/features/contractors/hooks/use-contractor-workers/types";
import { WorkerInfoRow } from "./WorkerInfoRow";

interface WorkerPersonalInfoCardProps {
  worker: ContractorWorker;
}

export function WorkerPersonalInfoCard({ worker }: WorkerPersonalInfoCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">{t("contractors.workers.personalInfo", "Personal Information")}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <WorkerInfoRow icon={Shield} label={t("contractors.workers.idType", "ID Type")} value={worker.id_type || "-"} />
          <WorkerInfoRow icon={Shield} label={t("contractors.workers.nationalId", "National ID")} value={worker.national_id} mono />
          <WorkerInfoRow
            icon={Calendar}
            label={t("contractors.workers.dateOfBirth", "Date of Birth")}
            value={worker.date_of_birth ? format(new Date(worker.date_of_birth), "PP") : "-"}
          />
          <WorkerInfoRow icon={User} label={t("contractors.workers.gender", "Gender")} value={worker.gender || "-"} />
          <WorkerInfoRow icon={Globe} label={t("contractors.workers.nationality", "Nationality")} value={worker.nationality || "-"} />
          <WorkerInfoRow icon={Phone} label={t("contractors.workers.mobile", "Mobile")} value={worker.mobile_number} dir="ltr" />
          <WorkerInfoRow icon={Mail} label={t("common.email", "Email")} value={worker.email || "-"} />
          <WorkerInfoRow
            icon={Globe}
            label={t("contractors.workers.language", "Language")}
            value={worker.preferred_language === "ar" ? "العربية" : "English"}
          />
        </div>
      </CardContent>
    </Card>
  );
}
