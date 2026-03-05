import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, MinusCircle, ListChecks } from 'lucide-react';

interface AreaProgressCardProps {
  total: number;
  responded: number;
  passed: number;
  failed: number;
  na: number;
  percentage: number;
}

export function AreaProgressCard({
  total,
  responded,
  passed,
  failed,
  na,
  percentage,
}: AreaProgressCardProps) {
  const { t } = useTranslation();
  
  const remaining = total - responded;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{t('inspections.checklistProgress')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('inspections.answeredOf', { answered: responded, total })}
            </span>
            <span className="font-medium">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-3" />
          {remaining > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('inspections.remainingItems', { count: remaining })}
            </p>
          )}
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
            <ListChecks className="h-5 w-5 text-primary mb-1" />
            <p className="text-lg font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">{t('inspections.totalItems')}</p>
          </div>
          
          <div className="flex flex-col items-center p-2 rounded-lg bg-green-500/10">
            <CheckCircle className="h-5 w-5 text-green-600 mb-1" />
            <p className="text-lg font-bold text-green-600">{passed}</p>
            <p className="text-xs text-muted-foreground">{t('inspections.results.pass')}</p>
          </div>
          
          <div className="flex flex-col items-center p-2 rounded-lg bg-red-500/10">
            <XCircle className="h-5 w-5 text-red-600 mb-1" />
            <p className="text-lg font-bold text-red-600">{failed}</p>
            <p className="text-xs text-muted-foreground">{t('inspections.results.fail')}</p>
          </div>
          
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted">
            <MinusCircle className="h-5 w-5 text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{na}</p>
            <p className="text-xs text-muted-foreground">{t('inspections.results.na')}</p>
          </div>
        </div>
        
        {/* Compliance Badge */}
        {responded === total && total > 0 && (
          <div className="pt-2">
            <Badge 
              variant={failed === 0 ? 'default' : failed <= 2 ? 'secondary' : 'destructive'}
              className="w-full justify-center py-1"
            >
              {failed === 0 
                ? t('inspectionSessions.excellent')
                : failed <= 2 
                  ? t('inspectionSessions.acceptable')
                  : t('inspectionSessions.needsAttention')
              }
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
