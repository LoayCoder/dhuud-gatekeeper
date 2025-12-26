import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChannelIcon } from '@/components/notifications/ChannelIcon';
import { DeliveryStatusBadge } from '@/components/notifications/DeliveryStatusBadge';
import { 
  Clock, 
  User, 
  AlertTriangle, 
  FileText, 
  Zap,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import type { UnifiedNotificationLog } from '@/hooks/use-notification-delivery-logs';

interface DeliveryLogDetailDialogProps {
  log: UnifiedNotificationLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  'level_1': 'bg-emerald-100 text-emerald-700',
  'level_2': 'bg-yellow-100 text-yellow-700',
  'level_3': 'bg-orange-100 text-orange-700',
  'level_4': 'bg-red-100 text-red-700',
  'level_5': 'bg-red-200 text-red-800',
};

export function DeliveryLogDetailDialog({ 
  log, 
  open, 
  onOpenChange 
}: DeliveryLogDetailDialogProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const dateLocale = isRTL ? ar : enUS;

  if (!log) return null;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'PPpp', { locale: dateLocale });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChannelIcon channel={log.channel} size="md" />
            <span>{isRTL ? 'تفاصيل الإشعار' : 'Notification Details'}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pe-4">
            {/* Status & Source */}
            <div className="flex items-center justify-between">
              <DeliveryStatusBadge status={log.status} size="md" />
              <Badge variant={log.source === 'incident' ? 'default' : 'secondary'}>
                {log.source === 'incident' 
                  ? (isRTL ? 'إشعار حادثة' : 'Incident Alert')
                  : (isRTL ? 'إشعار يدوي' : 'Manual Notification')
                }
              </Badge>
            </div>

            <Separator />

            {/* Recipient */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-muted-foreground" />
                {isRTL ? 'المستلم' : 'Recipient'}
              </div>
              <p className="text-sm font-mono bg-muted px-3 py-2 rounded-md">
                {log.recipient}
              </p>
            </div>

            {/* Subject/Event */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {isRTL ? 'الموضوع' : 'Subject/Event'}
              </div>
              <p className="text-sm bg-muted px-3 py-2 rounded-md">
                {log.subject_or_event}
              </p>
            </div>

            {/* Incident-specific details */}
            {log.source === 'incident' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    {isRTL ? 'تفاصيل الحادثة' : 'Incident Details'}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {log.severity_level && (
                      <div>
                        <span className="text-muted-foreground">{isRTL ? 'المستوى:' : 'Severity:'}</span>
                        <Badge 
                          className={`ms-2 ${SEVERITY_COLORS[log.severity_level] || 'bg-gray-100 text-gray-700'}`}
                          variant="secondary"
                        >
                          {log.severity_level.replace('level_', 'L')}
                        </Badge>
                      </div>
                    )}
                    
                    {log.stakeholder_role && (
                      <div>
                        <span className="text-muted-foreground">{isRTL ? 'الدور:' : 'Role:'}</span>
                        <span className="ms-2 font-medium capitalize">
                          {log.stakeholder_role.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}

                    {log.was_erp_override && (
                      <div className="col-span-2">
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          <Shield className="h-3 w-3 me-1" />
                          {isRTL ? 'تجاوز ERP' : 'ERP Override'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Manual notification details */}
            {log.source === 'manual' && log.template_name && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {isRTL ? 'القالب' : 'Template'}
                  </div>
                  <p className="text-sm">{log.template_name}</p>
                </div>
              </>
            )}

            {/* Error message */}
            {log.error_message && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    {isRTL ? 'رسالة الخطأ' : 'Error Message'}
                  </div>
                  <p className="text-sm bg-destructive/10 text-destructive px-3 py-2 rounded-md">
                    {log.error_message}
                  </p>
                </div>
              </>
            )}

            <Separator />

            {/* Timestamps */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {isRTL ? 'التوقيتات' : 'Timestamps'}
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isRTL ? 'تم الإنشاء:' : 'Created:'}</span>
                  <span>{formatDate(log.created_at)}</span>
                </div>
                {log.sent_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRTL ? 'تم الإرسال:' : 'Sent:'}</span>
                    <span>{formatDate(log.sent_at)}</span>
                  </div>
                )}
                {log.delivered_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRTL ? 'تم التسليم:' : 'Delivered:'}</span>
                    <span>{formatDate(log.delivered_at)}</span>
                  </div>
                )}
                {log.read_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isRTL ? 'تمت القراءة:' : 'Read:'}</span>
                    <span>{formatDate(log.read_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Provider info */}
            {(log.provider || log.provider_message_id) && (
              <>
                <Separator />
                <div className="text-xs text-muted-foreground space-y-1">
                  {log.provider && <p>Provider: {log.provider}</p>}
                  {log.provider_message_id && (
                    <p className="font-mono break-all">ID: {log.provider_message_id}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
