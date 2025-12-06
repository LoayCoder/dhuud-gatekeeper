import { Loader2, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface UploadProgressProps {
  current: number;
  total: number;
  fileName?: string;
  className?: string;
}

export function UploadProgress({ current, total, fileName, className }: UploadProgressProps) {
  const { t } = useTranslation();
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const isComplete = current === total && total > 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          <span className="text-muted-foreground">
            {isComplete 
              ? t('upload.complete', 'Upload complete')
              : t('upload.uploading', 'Uploading...')}
          </span>
        </div>
        <span className="font-medium">
          {current}/{total}
        </span>
      </div>
      
      <Progress value={percentage} className="h-2" />
      
      {fileName && !isComplete && (
        <p className="text-xs text-muted-foreground truncate">
          {fileName}
        </p>
      )}
    </div>
  );
}

interface UploadProgressOverlayProps {
  isUploading: boolean;
  current: number;
  total: number;
}

export function UploadProgressOverlay({ isUploading, current, total }: UploadProgressOverlayProps) {
  const { t } = useTranslation();
  
  if (!isUploading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm p-6 rounded-lg bg-card border shadow-lg">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium">
              {t('upload.processingFiles', 'Processing files...')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {current}/{total} {t('upload.filesUploaded', 'files uploaded')}
            </p>
          </div>
          <Progress value={(current / total) * 100} className="w-full h-2" />
        </div>
      </div>
    </div>
  );
}
