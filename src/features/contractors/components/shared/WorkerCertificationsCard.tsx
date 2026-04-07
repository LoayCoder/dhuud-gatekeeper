import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";
import { ContractorWorker } from "@/features/contractors/hooks/use-contractor-workers/types";

interface WorkerCertificationsCardProps {
  worker: ContractorWorker;
}

export function WorkerCertificationsCard({ worker }: WorkerCertificationsCardProps) {
  const { t } = useTranslation();

  if (!worker.training_certifications || worker.training_certifications.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          {t("contractors.workers.trainingCertifications", "Training Certifications")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex flex-wrap gap-2">
          {worker.training_certifications.map((cert, i) => (
            <Badge key={i} variant="secondary">{cert}</Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
