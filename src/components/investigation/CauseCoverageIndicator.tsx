import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Link2 } from 'lucide-react';
import { useInvestigationCompleteness } from '@/hooks/use-investigation-completeness';
import { cn } from '@/lib/utils';

interface CauseCoverageIndicatorProps {
  incidentId: string;
}

export function CauseCoverageIndicator({ incidentId }: CauseCoverageIndicatorProps) {
  const { t } = useTranslation();
  const { causeCoverage } = useInvestigationCompleteness(incidentId);

  if (causeCoverage.totalCount === 0) {
    return null;
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            {t('investigation.actions.causeCoverage', 'Cause Coverage')}
          </span>
          <Badge variant={causeCoverage.allCovered ? 'default' : 'secondary'}>
            {causeCoverage.coveredCount}/{causeCoverage.totalCount}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Root Causes */}
        {causeCoverage.rootCauses.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t('investigation.rca.rootCauses', 'Root Causes')}
            </p>
            {causeCoverage.rootCauses.map((rc, idx) => (
              <div 
                key={rc.id}
                className={cn(
                  'flex items-start gap-2 text-sm p-2 rounded-md',
                  rc.hasAction 
                    ? 'bg-green-50 dark:bg-green-950/30' 
                    : 'bg-amber-50 dark:bg-amber-950/30'
                )}
              >
                {rc.hasAction ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
                  <p className="text-sm truncate">{rc.text}</p>
                </div>
                <Badge 
                  variant={rc.hasAction ? 'outline' : 'secondary'} 
                  className="text-xs shrink-0"
                >
                  {rc.hasAction 
                    ? t('investigation.actions.hasAction', 'Has Action') 
                    : t('investigation.actions.needsAction', 'Needs Action')}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Contributing Factors */}
        {causeCoverage.contributingFactors.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t('investigation.rca.contributingFactors', 'Contributing Factors')}
            </p>
            {causeCoverage.contributingFactors.map((cf, idx) => (
              <div 
                key={cf.id}
                className={cn(
                  'flex items-start gap-2 text-sm p-2 rounded-md',
                  cf.hasAction 
                    ? 'bg-green-50 dark:bg-green-950/30' 
                    : 'bg-amber-50 dark:bg-amber-950/30'
                )}
              >
                {cf.hasAction ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
                  <p className="text-sm truncate">{cf.text}</p>
                </div>
                <Badge 
                  variant={cf.hasAction ? 'outline' : 'secondary'} 
                  className="text-xs shrink-0"
                >
                  {cf.hasAction 
                    ? t('investigation.actions.hasAction', 'Has Action') 
                    : t('investigation.actions.needsAction', 'Needs Action')}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
