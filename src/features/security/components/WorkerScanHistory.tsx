import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { History, LogIn, LogOut, HardHat, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScanEntry {
  id: string;
  person_name: string;
  entry_type: string;
  entry_time: string;
  exit_time: string | null;
  destination_name: string | null;
}

export function WorkerScanHistory() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['worker-scan-history', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('gate_entry_logs')
        .select('id, person_name, entry_type, entry_time, exit_time, destination_name')
        .eq('tenant_id', profile.tenant_id)
        .eq('entry_type', 'contractor')
        .gte('entry_time', today.toISOString())
        .order('entry_time', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as ScanEntry[];
    },
    enabled: !!profile?.tenant_id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {t('security.workerScanHistory.title', 'Today\'s Worker Scans')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          {t('security.workerScanHistory.title', 'Today\'s Worker Scans')}
          <Badge variant="secondary" className="ms-2">{entries.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[400px] pe-4">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <HardHat className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">{t('security.workerScanHistory.noScans', 'No worker scans today')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                const isOnSite = !entry.exit_time;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                      isOnSite 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' 
                        : 'bg-muted/50 border-border'
                    )}
                  >
                    {/* Entry/Exit Icon */}
                    <div className={cn(
                      'p-2 rounded-full',
                      isOnSite 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' 
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {isOnSite ? (
                        <LogIn className="h-4 w-4" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                    </div>

                    {/* Worker Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{entry.person_name}</p>
                      {entry.destination_name && (
                        <p className="text-xs text-muted-foreground truncate">{entry.destination_name}</p>
                      )}
                    </div>

                    {/* Time Info */}
                    <div className="flex flex-col items-end text-end shrink-0">
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(entry.entry_time), 'HH:mm')}</span>
                      </div>
                      {isOnSite ? (
                        <Badge variant="default" className="bg-green-600 text-white text-xs mt-1">
                          {t('security.gate.onSite', 'On Site')}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground mt-1">
                          {t('security.workerScanHistory.exitedAt', 'Exited')} {format(new Date(entry.exit_time!), 'HH:mm')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
