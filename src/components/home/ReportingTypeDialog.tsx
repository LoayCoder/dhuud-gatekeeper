import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Eye, Siren } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface ReportingTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportingTypeDialog({ open, onOpenChange }: ReportingTypeDialogProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const handleSelect = (mode: 'observation' | 'incident') => {
    onOpenChange(false);
    navigate(`/incidents/report?mode=${mode}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={i18n.dir()} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {t('quickObservation.selectEventType')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-center gap-8 py-6">
          {/* Observation */}
          <button
            onClick={() => handleSelect('observation')}
            className="flex flex-col items-center gap-3 group"
          >
            <div
              className={cn(
                'flex items-center justify-center',
                'w-20 h-20 rounded-full',
                'bg-warning/10 dark:bg-warning/20',
                'transition-all duration-200',
                'group-hover:bg-warning/20 dark:group-hover:bg-warning/30',
                'group-hover:scale-105',
                'group-active:scale-95'
              )}
            >
              <Eye className="w-9 h-9 text-warning" />
            </div>
            <span className="text-sm font-medium text-foreground">
              {t('quickObservation.observationTitle')}
            </span>
          </button>

          {/* Incident */}
          <button
            onClick={() => handleSelect('incident')}
            className="flex flex-col items-center gap-3 group"
          >
            <div
              className={cn(
                'flex items-center justify-center',
                'w-20 h-20 rounded-full',
                'bg-destructive/10 dark:bg-destructive/20',
                'transition-all duration-200',
                'group-hover:bg-destructive/20 dark:group-hover:bg-destructive/30',
                'group-hover:scale-105',
                'group-active:scale-95'
              )}
            >
              <Siren className="w-9 h-9 text-destructive" />
            </div>
            <span className="text-sm font-medium text-foreground">
              {t('quickObservation.incidentTitle')}
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
