import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Send, 
  AlertTriangle, 
  Users,
  Check
} from 'lucide-react';
import type { VersionInfo, BroadcastParams } from '@/hooks/use-app-updates';

interface BroadcastUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versionInfo: VersionInfo;
  subscriptionCount: number;
  onBroadcast: (params: BroadcastParams) => void;
  isBroadcasting: boolean;
}

export function BroadcastUpdateDialog({
  open,
  onOpenChange,
  versionInfo,
  subscriptionCount,
  onBroadcast,
  isBroadcasting,
}: BroadcastUpdateDialogProps) {
  const { t, i18n } = useTranslation();
  const [priority, setPriority] = useState<'normal' | 'important' | 'critical'>(versionInfo.priority);
  const [customMessage, setCustomMessage] = useState('');

  const handleBroadcast = () => {
    onBroadcast({
      version: versionInfo.version,
      release_notes: versionInfo.releaseNotes,
      priority,
      custom_body: customMessage || undefined,
      language: i18n.language,
    });
    onOpenChange(false);
  };

  const getPriorityDescription = (p: string) => {
    switch (p) {
      case 'critical':
        return t('admin.updates.priorityCriticalDesc', 'Persistent notification, requires interaction');
      case 'important':
        return t('admin.updates.priorityImportantDesc', 'High visibility notification');
      default:
        return t('admin.updates.priorityNormalDesc', 'Standard notification');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {t('admin.updates.confirmBroadcast', 'Confirm Broadcast')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.updates.confirmBroadcastDesc', 'Send update notification to all users with push enabled')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Version Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{t('admin.updates.version', 'Version')}</span>
              <span className="text-lg font-bold">{versionInfo.version}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">{t('admin.updates.recipients', 'Recipients')}</span>
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {subscriptionCount} {t('admin.updates.users', 'users')}
              </Badge>
            </div>
          </div>

          {/* Release Notes Preview */}
          {versionInfo.releaseNotes.length > 0 && (
            <div className="space-y-2">
              <Label>{t('admin.updates.releaseNotes', 'Release Notes')}</Label>
              <ScrollArea className="h-24 p-3 border rounded-md">
                <ul className="space-y-1 text-sm">
                  {versionInfo.releaseNotes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}

          {/* Priority Selection */}
          <div className="space-y-2">
            <Label>{t('admin.updates.notificationPriority', 'Notification Priority')}</Label>
            <RadioGroup
              value={priority}
              onValueChange={(v) => setPriority(v as 'normal' | 'important' | 'critical')}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50">
                <RadioGroupItem value="normal" id="normal" />
                <Label htmlFor="normal" className="flex-1 cursor-pointer">
                  <span className="font-medium">{t('admin.updates.priorityNormal', 'Normal')}</span>
                  <p className="text-xs text-muted-foreground">{getPriorityDescription('normal')}</p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50 border-warning/50">
                <RadioGroupItem value="important" id="important" />
                <Label htmlFor="important" className="flex-1 cursor-pointer">
                  <span className="font-medium text-warning">{t('admin.updates.priorityImportant', 'Important')}</span>
                  <p className="text-xs text-muted-foreground">{getPriorityDescription('important')}</p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50 border-destructive/50">
                <RadioGroupItem value="critical" id="critical" />
                <Label htmlFor="critical" className="flex-1 cursor-pointer">
                  <span className="font-medium text-destructive">{t('admin.updates.priorityCritical', 'Critical')}</span>
                  <p className="text-xs text-muted-foreground">{getPriorityDescription('critical')}</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="customMessage">
              {t('admin.updates.customMessage', 'Custom Message')} ({t('common.optional', 'optional')})
            </Label>
            <Textarea
              id="customMessage"
              placeholder={t('admin.updates.customMessagePlaceholder', 'Add a custom message to the notification...')}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={2}
            />
          </div>

          {/* Critical Warning */}
          {priority === 'critical' && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <span>
                {t('admin.updates.criticalWarning', 'Critical notifications require user interaction and are highly disruptive. Use only for urgent security updates or breaking changes.')}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBroadcasting}>
            {t('actions.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleBroadcast} disabled={isBroadcasting} className="gap-2">
            {isBroadcasting ? (
              <>
                <Send className="h-4 w-4 animate-pulse" />
                {t('admin.updates.sending', 'Sending...')}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {t('admin.updates.sendNotification', 'Send Notification')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
