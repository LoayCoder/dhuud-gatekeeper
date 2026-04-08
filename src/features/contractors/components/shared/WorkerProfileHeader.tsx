import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ContractorWorker } from "@/features/contractors/hooks/use-contractor-workers/types";
import { WORKER_ROLES } from "@/features/contractors/constants/worker-constants";

interface WorkerProfileHeaderProps {
  worker: ContractorWorker;
  photoUrl?: string | null;
}

export function WorkerProfileHeader({ worker, photoUrl }: WorkerProfileHeaderProps) {
  const { t } = useTranslation();

  const roleLabel = worker.worker_role
    ? WORKER_ROLES.find(r => r.value === worker.worker_role)
    : null;

  return (
    <>
      <div className="flex items-start gap-4">
        <Avatar className="h-20 w-20 border-2 border-border">
          <AvatarImage src={photoUrl || undefined} />
          <AvatarFallback className="text-xl">{worker.full_name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <h3 className="text-base font-semibold">{worker.full_name}</h3>
          {worker.full_name_ar && (
            <p className="text-sm text-muted-foreground" dir="rtl">{worker.full_name_ar}</p>
          )}
          <p className="text-sm text-muted-foreground">{worker.company?.company_name}</p>
          {worker.worker_role && (
            <Badge variant="secondary" className="mt-1">
              {roleLabel ? t(roleLabel.labelKey, roleLabel.fallback) : worker.worker_role}
            </Badge>
          )}
        </div>
      </div>
      <Separator />
    </>
  );
}
