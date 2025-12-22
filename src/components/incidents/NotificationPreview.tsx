/**
 * NotificationPreview - Shows who will be notified before incident submission
 * Displays stakeholder roles and their notification channels based on severity matrix
 */

import { useTranslation } from 'react-i18next';
import { AlertTriangle, Bell, Mail, MessageCircle, Smartphone, Users, Zap, Shield, Siren } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNotificationPreview, type NotificationPreviewRecipient } from '@/hooks/use-notification-preview';
import type { SeverityLevelV2 } from '@/lib/hsse-severity-levels';

interface NotificationPreviewProps {
  severityLevel: SeverityLevelV2 | undefined;
  hasInjury: boolean;
  erpActivated: boolean;
  siteId?: string;
  className?: string;
}

// Channel icons
const CHANNEL_ICONS: Record<string, typeof Bell> = {
  'push': Smartphone,
  'email': Mail,
  'whatsapp': MessageCircle,
};

// Channel colors
const CHANNEL_COLORS: Record<string, string> = {
  'push': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'email': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'whatsapp': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

// Role icons
const ROLE_ICONS: Record<string, typeof Users> = {
  'area_owner': Users,
  'hsse_manager': Shield,
  'dept_representative': Users,
  'hsse_expert': Shield,
  'bc_team': Siren,
  'first_aider': Zap,
  'clinic_team': Zap,
  'security': Shield,
};

export function NotificationPreview({
  severityLevel,
  hasInjury,
  erpActivated,
  siteId,
  className,
}: NotificationPreviewProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const {
    effectiveSeverity,
    previewRecipients,
    whatsappRecipients,
    isHighPriority,
    isErpOverride,
    isLoading,
    roleLabels,
  } = useNotificationPreview({
    severityLevel,
    hasInjury,
    erpActivated,
    siteId,
  });

  if (isLoading) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show if no severity selected
  if (!severityLevel) {
    return null;
  }

  const getRoleLabel = (role: string) => {
    const labels = roleLabels[role];
    if (!labels) return role;
    return isRTL ? labels.ar : labels.en;
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case 'push': return t('notifications.channels.push', 'App');
      case 'email': return t('notifications.channels.email', 'Email');
      case 'whatsapp': return 'WhatsApp';
      default: return channel;
    }
  };

  return (
    <Card className={cn(
      'border-2 transition-colors',
      erpActivated ? 'border-destructive bg-destructive/5' : 
      isHighPriority ? 'border-warning bg-warning/5' : 
      'border-muted',
      className
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4" />
          {t('incidents.notificationPreview.title', 'Who Will Be Notified')}
          {isErpOverride && (
            <Badge variant="destructive" className="text-xs">
              {t('incidents.notificationPreview.erpOverride', 'ERP Override')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* ERP Warning */}
        {erpActivated && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {t('incidents.notificationPreview.erpWarning', 
                'Emergency Response Plan activated. Critical alerts will be sent to all stakeholders via WhatsApp.'
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* WhatsApp Warning for Level 3+ */}
        {whatsappRecipients.length > 0 && !erpActivated && (
          <Alert className="py-2 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
            <MessageCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-xs text-green-700 dark:text-green-400">
              {t('incidents.notificationPreview.whatsappWarning', 
                '{{count}} stakeholder(s) will receive WhatsApp alerts', 
                { count: whatsappRecipients.length }
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Recipient List */}
        {previewRecipients.length > 0 ? (
          <div className="space-y-2">
            {previewRecipients.map((recipient) => {
              const RoleIcon = ROLE_ICONS[recipient.stakeholder_role] || Users;
              
              return (
                <div 
                  key={recipient.stakeholder_role}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <RoleIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {getRoleLabel(recipient.stakeholder_role)}
                    </span>
                    {recipient.condition_type === 'injury' && (
                      <Badge variant="outline" className="text-xs py-0 h-5">
                        {t('incidents.notificationPreview.ifInjury', 'if injury')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {recipient.channels.map((channel) => {
                      const ChannelIcon = CHANNEL_ICONS[channel] || Bell;
                      return (
                        <Badge 
                          key={channel}
                          variant="secondary"
                          className={cn(
                            'text-xs py-0 h-5 gap-1',
                            CHANNEL_COLORS[channel]
                          )}
                        >
                          <ChannelIcon className="h-3 w-3" />
                          {getChannelLabel(channel)}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            {t('incidents.notificationPreview.noRecipients', 'No notifications configured for this severity level')}
          </p>
        )}

        {/* Summary Footer */}
        <div className="text-xs text-muted-foreground text-center pt-1 border-t">
          {t('incidents.notificationPreview.summary', 
            'Based on severity {{level}} notification matrix', 
            { level: effectiveSeverity.replace('level_', '') }
          )}
        </div>
      </CardContent>
    </Card>
  );
}
