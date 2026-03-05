import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WifiOff, AlertTriangle, X, Trophy } from 'lucide-react';
import { UploadProgressOverlay } from '@/components/ui/upload-progress';
import { OfflineReportingBanner } from '@/components/offline/OfflineReportingBanner';
import { SubmissionSuccessDialog } from '@/features/incidents';
import { useQuickObservationCard } from './hooks/useQuickObservationCard';
import { QuickObservationCardForm } from './QuickObservationCardForm';
import { QuickObservationCardProps } from './types';

export function QuickObservationCard({ onCancel }: QuickObservationCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();
  
  const state = useQuickObservationCard();
  const {
    isUploading, uploadProgress, isOnline, pendingCount,
    activeEvent, submittedObservation, form, onSubmit
  } = state;

  return (
    <div className="container max-w-lg py-6" dir={direction}>
      {isUploading && <UploadProgressOverlay isUploading={isUploading} current={Math.round(uploadProgress / 10)} total={10} />}
      
      {(!isOnline || pendingCount > 0) && (
        <OfflineReportingBanner compact className="mb-4" />
      )}
      
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              {!isOnline && <WifiOff className="h-5 w-5 text-warning" />}
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {t('quickObservation.title')}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {!isOnline 
              ? t('offline.offlineModeDescription', 'Your observation will be saved and synced when online')
              : t('quickObservation.subtitle')}
          </p>
        </CardHeader>
        
        {activeEvent && (
          <div className="mx-4 mb-4 rounded-lg border-2 border-info bg-info/5 p-3">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 rounded-full bg-info p-1.5">
                <Trophy className="h-4 w-4 text-info-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {t('specialEvents.eventBannerTitle')}
                </p>
                <p className="text-sm font-bold text-info truncate">
                  {activeEvent.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('specialEvents.eventBannerNote')}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <CardContent>
          <QuickObservationCardForm state={state} form={form} onSubmit={onSubmit} />
        </CardContent>
      </Card>
      
      <SubmissionSuccessDialog
        open={!!submittedObservation}
        referenceId={submittedObservation?.referenceId || ''}
        incidentId={submittedObservation?.id || ''}
        onViewIncident={
          ((submittedObservation?.id || '').startsWith('offline_'))
            ? undefined 
            : () => submittedObservation && navigate(`/incidents/${submittedObservation.id}`)
        }
      />
    </div>
  );
}

