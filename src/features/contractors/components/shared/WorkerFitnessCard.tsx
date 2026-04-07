import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, Calendar, Check, X, FileDown } from "lucide-react";
import { format } from "date-fns";
import { ContractorWorker } from "@/features/contractors/hooks/use-contractor-workers/types";
import { WorkerInfoRow } from "./WorkerInfoRow";
import { WorkerFitnessBadge } from "./WorkerFitnessBadge";
import { FITNESS_OPTIONS } from "@/features/contractors/constants/worker-constants";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface WorkerFitnessCardProps {
  worker: ContractorWorker;
}

export function WorkerFitnessCard({ worker }: WorkerFitnessCardProps) {
  const { t } = useTranslation();

  const handleDownloadCert = async () => {
    if (!worker.medical_certificate_path) return;
    try {
      const { data, error } = await supabase.storage
        .from("contractor-documents")
        .createSignedUrl(worker.medical_certificate_path, 3600);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } catch {
      toast.error(t("contractors.workers.certDownloadFailed", "Failed to download certificate"));
    }
  };

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <HeartPulse className="h-4 w-4" />
          {t("contractors.workers.fitnessToWork", "Fitness to Work")}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 text-sm space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-muted-foreground">{t("common.status", "Status")}</span>
            <div className="mt-1">
              <WorkerFitnessBadge status={worker.fitness_to_work} />
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">{t("contractors.workers.acknowledged", "Acknowledged")}</span>
            <div className="mt-1">
              {worker.fitness_acknowledged ? (
                <Badge variant="outline" className="text-success border-success/30">
                  <Check className="h-3 w-3 me-1" /> {t("common.yes", "Yes")}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-warning border-warning/30">
                  <X className="h-3 w-3 me-1" /> {t("common.no", "No")}
                </Badge>
              )}
            </div>
          </div>
          <WorkerInfoRow
            icon={Calendar}
            label={t("contractors.workers.medicalCheckDate", "Medical Check")}
            value={worker.medical_check_date ? format(new Date(worker.medical_check_date), "PP") : "-"}
          />
          <WorkerInfoRow
            icon={Calendar}
            label={t("contractors.workers.fitnessExpiry", "Fitness Expiry")}
            value={worker.fitness_expiry_date ? format(new Date(worker.fitness_expiry_date), "PP") : "-"}
          />
        </div>
        {worker.medical_certificate_path && (
          <div className="pt-2 border-t">
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleDownloadCert}>
              <FileDown className="h-4 w-4" />
              {t("contractors.workers.downloadMedicalCert", "Download Medical Certificate")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
