import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Camera, CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { WorkerPhotoUpload } from "./WorkerPhotoUpload";
import { useVerifyWorkerPhoto } from "@/features/contractors/hooks/use-contractor-workers/use-worker-photo-mutations";
import { supabase } from "@/integrations/supabase/client";
import type { ContractorWorker } from "@/features/contractors/hooks/use-contractor-workers";

interface WorkerPhotoGateProps {
  worker: ContractorWorker;
  onVerified?: () => void;
}

export function WorkerPhotoGate({ worker, onVerified }: WorkerPhotoGateProps) {
  const { t } = useTranslation();
  const verifyPhoto = useVerifyWorkerPhoto();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const isPhotoVerified = !!worker.photo_verified_at && !!worker.photo_path;

  // Fetch signed URL for existing photo
  useEffect(() => {
    const fetchUrl = async () => {
      if (!worker.photo_path) {
        setPhotoUrl(null);
        return;
      }
      const { data } = await supabase.storage
        .from("worker-photos")
        .createSignedUrl(worker.photo_path, 3600);
      if (data?.signedUrl) setPhotoUrl(data.signedUrl);
    };
    fetchUrl();
  }, [worker.photo_path]);

  // Photo already verified
  if (isPhotoVerified) {
    return (
      <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={photoUrl || undefined} alt={worker.full_name} />
              <AvatarFallback>{worker.full_name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                <span className="font-medium text-green-700 dark:text-green-300">
                  {t("contractors.workers.photoVerified", "Photo Verified")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t("contractors.workers.photoGatePass", "Worker photo is captured and verified. Ready for next steps.")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Photo required
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Camera className="h-4 w-4" />
          {t("contractors.workers.photoCapture", "Photo Capture")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive" className="bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 [&>svg]:text-amber-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("contractors.workers.photoRequired", "Photo Required")}</AlertTitle>
          <AlertDescription>
            {t("contractors.workers.photoRequiredDesc", "A worker photo must be captured and verified before proceeding to Induction or ID Card generation.")}
          </AlertDescription>
        </Alert>

        <WorkerPhotoUpload
          photoPath={worker.photo_path}
          onPhotoChange={(path) => {
            if (path) {
              verifyPhoto.mutate(
                { workerId: worker.id, photoPath: path },
                { onSuccess: () => onVerified?.() }
              );
            }
          }}
          workerId={worker.id}
        />
      </CardContent>
    </Card>
  );
}
