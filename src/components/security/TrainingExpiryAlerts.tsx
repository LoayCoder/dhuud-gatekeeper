import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, GraduationCap } from 'lucide-react';
import { useExpiringTraining } from '@/hooks/use-guard-training';

interface TrainingExpiryAlertsProps {
  daysAhead?: number;
  limit?: number;
}

export function TrainingExpiryAlerts({ daysAhead = 30, limit = 5 }: TrainingExpiryAlertsProps) {
  const { t } = useTranslation();
  const { data: expiringRecords, isLoading } = useExpiringTraining(daysAhead);

  const isExpired = (date: string) => new Date(date) < new Date();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!expiringRecords?.length) {
    return null;
  }

  const displayRecords = expiringRecords.slice(0, limit);

  return (
    <Card className="border-yellow-500/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-yellow-500" />
          {t('security.training.expiryAlerts', 'Training Expiry Alerts')}
          <Badge variant="secondary">{expiringRecords.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayRecords.map(record => {
            const expired = isExpired(record.expiry_date!);
            return (
              <div 
                key={record.id} 
                className={`flex items-center justify-between p-3 rounded-lg ${expired ? 'bg-destructive/10' : 'bg-yellow-500/10'}`}
              >
                <div>
                  <p className="font-medium text-sm">{record.guard?.full_name || 'Unknown Guard'}</p>
                  <p className="text-xs text-muted-foreground">{record.training_name}</p>
                </div>
                <div className="text-end">
                  <Badge variant={expired ? "destructive" : "outline"} className="gap-1">
                    {expired ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                    {format(new Date(record.expiry_date!), 'PP')}
                  </Badge>
                </div>
              </div>
            );
          })}
          {expiringRecords.length > limit && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              +{expiringRecords.length - limit} {t('common.more', 'more')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
