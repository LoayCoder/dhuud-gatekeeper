import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Wrench, AlertCircle } from 'lucide-react';

interface DamageDetails {
  description?: string;
  estimated_cost?: number | string;
  type?: string;
}

interface IncidentDamageCardProps {
  hasDamage: boolean;
  damageDetails: DamageDetails | null;
}

export function IncidentDamageCard({
  hasDamage,
  damageDetails,
}: IncidentDamageCardProps) {
  const { t } = useTranslation();

  if (!hasDamage) return null;

  const description = damageDetails?.description || '';
  const estimatedCost = damageDetails?.estimated_cost;
  const damageType = damageDetails?.type;

  return (
    <Card className="border-orange-500/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-orange-600 dark:text-orange-500">
          <Wrench className="h-4 w-4" />
          {t('incidents.damageDetails', 'Damage Details')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estimated Cost */}
        {estimatedCost && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
              <DollarSign className="h-5 w-5 text-orange-600 dark:text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-500">
                {typeof estimatedCost === 'number' 
                  ? estimatedCost.toLocaleString() 
                  : estimatedCost}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('incidents.estimatedCost', 'Estimated Cost')}
              </p>
            </div>
          </div>
        )}

        {/* Damage Type */}
        {damageType && (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t('incidents.damageType', 'Type')}:
            </span>
            <Badge variant="outline" className="border-orange-500/50 text-orange-600 dark:text-orange-500">
              {t(`incidents.damageTypes.${damageType}`, damageType)}
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
