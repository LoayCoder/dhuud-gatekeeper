import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, FileText, MapPin, Calendar, User, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useIncident } from '@/hooks/use-incidents';
import { format } from 'date-fns';

const getSeverityBadgeVariant = (severity: string | null) => {
  switch (severity) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
};

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { data: incident, isLoading } = useIncident(id);

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-6 space-y-6" dir={direction}>
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="container max-w-4xl py-6" dir={direction}>
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('incidents.notFound')}</h3>
            <Button asChild variant="outline">
              <Link to="/incidents" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t('incidents.backToList')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6" dir={direction}>
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/incidents">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{incident.title}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{incident.reference_id}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {incident.severity && (
          <Badge variant={getSeverityBadgeVariant(incident.severity)} className="text-sm">
            {t(`incidents.severityLevels.${incident.severity}`)}
          </Badge>
        )}
        {incident.status && (
          <Badge variant="outline" className="text-sm">
            {t(`incidents.status.${incident.status}`)}
          </Badge>
        )}
        <Badge variant="secondary" className="text-sm">
          {t(`incidents.eventTypes.${incident.event_type}`)}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('incidents.description')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{incident.description}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('incidents.occurredAt')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incident.occurred_at && format(new Date(incident.occurred_at), 'PPpp')}
          </CardContent>
        </Card>

        {incident.location && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t('incidents.location')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {incident.location}
            </CardContent>
          </Card>
        )}
      </div>

      {incident.immediate_actions && (
        <Card>
          <CardHeader>
            <CardTitle>{t('incidents.immediateActions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{incident.immediate_actions}</p>
          </CardContent>
        </Card>
      )}

      {incident.has_injury && incident.injury_details && (
        <Card className="border-yellow-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
              {t('incidents.injuryDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(incident.injury_details, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {incident.has_damage && incident.damage_details && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <CardTitle className="text-orange-600 dark:text-orange-500">
              {t('incidents.damageDetails')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(incident.damage_details, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
