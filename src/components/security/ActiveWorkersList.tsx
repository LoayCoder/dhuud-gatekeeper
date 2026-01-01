import { useTranslation } from 'react-i18next';
import { LogOut, Clock, HardHat } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useGateEntries, useRecordExit } from '@/hooks/use-gate-entries';
import { formatDistanceToNow, format, startOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export function ActiveWorkersList() {
  const { t } = useTranslation();
  const today = startOfDay(new Date()).toISOString();
  
  const { data: entries, isLoading } = useGateEntries({
    dateFrom: today,
    entryType: 'worker',
    onlyActive: true,
  });
  
  const recordExit = useRecordExit();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HardHat className="h-4 w-4" />
            {t('security.gateDashboard.activeWorkers', 'Active Workers')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeWorkers = entries?.filter(e => !e.exit_time) || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <HardHat className="h-4 w-4" />
          {t('security.gateDashboard.activeWorkers', 'Active Workers')}
          <Badge variant="secondary" className="ms-auto">
            {activeWorkers.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeWorkers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <HardHat className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('security.gateDashboard.noActiveWorkers', 'No active workers on site')}</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pe-4">
            <div className="space-y-3">
              {activeWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-sm bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      {worker.person_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{worker.person_name || 'Unknown'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {t('security.gateDashboard.enteredAt', 'Entered')}: {format(new Date(worker.entry_time), 'HH:mm')}
                      </span>
                      <span className="text-primary">
                        ({formatDistanceToNow(new Date(worker.entry_time), { addSuffix: false })})
                      </span>
                    </div>
                    {worker.destination_name && (
                      <p className="text-xs text-muted-foreground truncate">
                        → {worker.destination_name}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => recordExit.mutate(worker.id)}
                    disabled={recordExit.isPending}
                  >
                    <LogOut className="h-3 w-3 me-1" />
                    {t('security.gateDashboard.exit', 'Exit')}
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
