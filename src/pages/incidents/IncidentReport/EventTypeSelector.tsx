import React from 'react';
import { Eye, Siren, CheckCircle2, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const EventTypeSelector = ({ setReportMode, t, direction }: { setReportMode: (mode: string) => void; t: (key: string) => string; direction: string }) => (
  <div className="container max-w-2xl py-6" dir={direction}>
    <div className="space-y-2 text-center mb-8">
      <h1 className="text-3xl font-bold tracking-tight">{t('quickObservation.selectEventType')}</h1>
      <p className="text-muted-foreground">{t('quickObservation.selectEventTypeDescription')}</p>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      {/* Observation Card */}
      <Card
        className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
        onClick={() => setReportMode('observation')}
      >
        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
            <Eye className="h-8 w-8 text-warning" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{t('quickObservation.observationTitle')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('quickObservation.observationDescription')}</p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t('quickObservation.quickReport')}
          </Badge>
        </CardContent>
      </Card>

      {/* Incident Card */}
      <Card
        className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
        onClick={() => setReportMode('incident')}
      >
        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
            <Siren className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{t('quickObservation.incidentTitle')}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t('quickObservation.incidentDescription')}</p>
          </div>
          <Badge variant="secondary" className="gap-1">
            <FileText className="h-3 w-3" />
            {t('quickObservation.fullForm')}
          </Badge>
        </CardContent>
      </Card>
    </div>
  </div>
);

// If no report mode selected, show the selector