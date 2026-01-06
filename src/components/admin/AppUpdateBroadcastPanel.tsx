import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  Send, 
  RefreshCw, 
  Check, 
  X, 
  AlertTriangle,
  Rocket,
  Users,
  Clock
} from 'lucide-react';
import { useAppUpdates } from '@/hooks/use-app-updates';
import { BroadcastUpdateDialog } from './BroadcastUpdateDialog';
import { UpdateHistoryTable } from './UpdateHistoryTable';
import { format } from 'date-fns';

export function AppUpdateBroadcastPanel() {
  const { t } = useTranslation();
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  
  const {
    versionInfo,
    isLoadingVersion,
    updateHistory,
    isLoadingHistory,
    subscriptionCount,
    broadcast,
    isBroadcasting,
    refresh,
  } = useAppUpdates();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'important': return 'bg-warning text-warning-foreground';
      default: return 'bg-primary text-primary-foreground';
    }
  };

  const lastBroadcast = updateHistory[0];
  const wasAlreadyBroadcast = lastBroadcast?.version === versionInfo?.version;

  return (
    <div className="space-y-6">
      {/* Current Version Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              {t('admin.updates.currentVersion', 'Current Version')}
            </CardTitle>
            <CardDescription>
              {t('admin.updates.versionDescription', 'Notify all users when you publish an update')}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            disabled={isLoadingVersion}
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingVersion ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingVersion ? (
            <div className="animate-pulse space-y-3">
              <div className="h-8 w-32 bg-muted rounded" />
              <div className="h-4 w-48 bg-muted rounded" />
            </div>
          ) : versionInfo ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">{versionInfo.version}</span>
                <Badge className={getPriorityColor(versionInfo.priority)}>
                  {versionInfo.priority}
                </Badge>
                {wasAlreadyBroadcast && (
                  <Badge variant="outline" className="gap-1">
                    <Check className="h-3 w-3" />
                    {t('admin.updates.alreadyBroadcast', 'Already Broadcast')}
                  </Badge>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground">
                <Clock className="inline-block h-4 w-4 me-1" />
                {t('admin.updates.buildDate', 'Build Date')}: {format(new Date(versionInfo.buildDate), 'PPpp')}
              </div>

              {versionInfo.releaseNotes.length > 0 && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">{t('admin.updates.releaseNotes', 'Release Notes')}:</span>
                  <ScrollArea className="max-h-32">
                    <ul className="list-disc ps-5 text-sm text-muted-foreground space-y-1">
                      {versionInfo.releaseNotes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {t('admin.updates.estimatedRecipients', 'Estimated Recipients')}: 
                    <span className="font-medium text-foreground ms-1">{subscriptionCount}</span>
                  </span>
                </div>

                <Button
                  onClick={() => setShowBroadcastDialog(true)}
                  disabled={wasAlreadyBroadcast || subscriptionCount === 0}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {t('admin.updates.notifyAllUsers', 'Notify All Users')}
                </Button>
              </div>

              {wasAlreadyBroadcast && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span>
                    {t('admin.updates.alreadyBroadcastMessage', 'This version was already broadcast. Deploy a new version to send another notification.')}
                  </span>
                </div>
              )}

              {subscriptionCount === 0 && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {t('admin.updates.noSubscriptions', 'No users have push notifications enabled. They need to enable notifications first.')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <X className="h-8 w-8 mx-auto mb-2" />
              <p>{t('admin.updates.versionNotFound', 'Version info not found')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('admin.updates.broadcastHistory', 'Broadcast History')}
          </CardTitle>
          <CardDescription>
            {t('admin.updates.historyDescription', 'Previous update notifications sent to users')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UpdateHistoryTable 
            updates={updateHistory} 
            isLoading={isLoadingHistory}
          />
        </CardContent>
      </Card>

      {/* Broadcast Dialog */}
      {versionInfo && (
        <BroadcastUpdateDialog
          open={showBroadcastDialog}
          onOpenChange={setShowBroadcastDialog}
          versionInfo={versionInfo}
          subscriptionCount={subscriptionCount}
          onBroadcast={broadcast}
          isBroadcasting={isBroadcasting}
        />
      )}
    </div>
  );
}
