import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, User, Activity } from 'lucide-react';

interface InjuryDetails {
  count?: number;
  description?: string;
  classification?: string;
}

interface IncidentInjuryCardProps {
  hasInjury: boolean;
  injuryDetails: InjuryDetails | null;
  injuryClassification?: string | null;
}

export function IncidentInjuryCard({
  hasInjury,
  injuryDetails,
  injuryClassification,
}: IncidentInjuryCardProps) {
  const { t } = useTranslation();

  if (!hasInjury) return null;

  const count = injuryDetails?.count || 0;
  const description = injuryDetails?.description || '';
  const classification = injuryClassification || injuryDetails?.classification;

  return (
    <Card className="border-yellow-500/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
          <AlertTriangle className="h-4 w-4" />
          {t('incidents.injuryDetails', 'Injury Details')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Injury Count */}
        {count > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30">
            <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900">
              <User className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
                {count}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('incidents.injuryCount', 'Persons Injured')}
              </p>
            </div>
          </div>
        )}

        {/* Classification */}
        {classification && (
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t('incidents.injuryClassification', 'Classification')}:
            </span>
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-500">
              {t(`incidents.injuryTypes.${classification}`, classification)}
            </Badge>
          </div>
        )}

        {/* Description */}
        {description && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {t('incidents.description', 'Description')}
            </p>
            <p className="text-sm">{description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
