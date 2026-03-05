import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useActiveEvent } from '@/hooks/use-special-events';

interface ActiveEventBannerProps {
  onEventDetected?: (eventId: string | null) => void;
}

export function ActiveEventBanner({ onEventDetected }: ActiveEventBannerProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { data: activeEvent, isLoading } = useActiveEvent();
  
  // Notify parent component when event is detected
  useEffect(() => {
    if (onEventDetected) {
      onEventDetected(activeEvent?.id || null);
    }
  }, [activeEvent, onEventDetected]);
  
  if (isLoading || !activeEvent) {
    return null;
  }
  
  const startDate = format(parseISO(activeEvent.start_at), 'PP');
  const endDate = format(parseISO(activeEvent.end_at), 'PP');
  
  return (
    <div 
      className="mb-6 rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30 p-4"
      dir={direction}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-full bg-blue-500 p-2">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100">
            {t('specialEvents.eventBannerTitle')}
          </h4>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">
            {activeEvent.name}
          </p>
          <div className="flex items-center gap-1 mt-2 text-sm text-blue-600 dark:text-blue-400">
            <Calendar className="h-3.5 w-3.5" />
            <span>{startDate} – {endDate}</span>
          </div>
          {activeEvent.description && (
            <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
              {activeEvent.description}
            </p>
          )}
        </div>
      </div>
      <p className="mt-3 text-sm text-blue-700 dark:text-blue-300 border-t border-blue-200 dark:border-blue-800 pt-3">
        {t('specialEvents.eventBannerNote')}
      </p>
    </div>
  );
}
