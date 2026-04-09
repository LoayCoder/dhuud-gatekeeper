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
      <DialogContent
        dir={i18n.dir()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-center">
            {t('quickObservation.selectType', 'What would you like to report?')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex justify-center gap-8 py-6">
          {/* Observation */}
          <button
            type="button"
            onClick={() => handleSelect('observation')}
            className="flex flex-col items-center gap-3 group"
          >
            <div
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center',
                'bg-warning/10 dark:bg-warning/20',
                'border-2 border-warning/30',
                'transition-all duration-200',
                'group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-warning/20',
                'group-hover:border-warning/60',
                'group-active:scale-95'
              )}
            >
              <Eye className="w-9 h-9 text-warning" />
            </div>
            <div className="text-center">
              <span className="block text-sm font-semibold text-foreground">
                {t('quickObservation.observationTitle', 'Observation')}
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5 max-w-[120px]">
                {t('quickObservation.observationDescription', 'Report a safety observation')}
              </span>
            </div>
          </button>

          {/* Incident */}
          <button
            type="button"
            onClick={() => handleSelect('incident')}
            className="flex flex-col items-center gap-3 group"
          >
            <div
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center',
                'bg-destructive/10 dark:bg-destructive/20',
                'border-2 border-destructive/30',
                'transition-all duration-200',
                'group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-destructive/20',
                'group-hover:border-destructive/60',
                'group-active:scale-95'
              )}
            >
              <Siren className="w-9 h-9 text-destructive" />
            </div>
            <div className="text-center">
              <span className="block text-sm font-semibold text-foreground">
                {t('quickObservation.incidentTitle', 'Incident')}
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5 max-w-[120px]">
                {t('quickObservation.incidentDescription', 'Report a safety incident')}
              </span>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
