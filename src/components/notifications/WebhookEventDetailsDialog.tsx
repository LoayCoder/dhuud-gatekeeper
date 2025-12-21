import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Send, 
  Eye, 
  XCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import type { DeliveryStatus } from "./DeliveryStatusBadge";

interface WebhookEvent {
  provider: string;
  event_type: string;
  status?: string;
  ack?: number;
  ack_name?: string;
  error_code?: string;
  error_message?: string;
  error?: string;
  received_at: string;
  raw_payload?: unknown;
}

interface NotificationLogDetails {
  id: string;
  channel: string;
  provider: string;
  provider_message_id: string | null;
  to_address: string;
  template_name: string | null;
  subject: string | null;
  status: DeliveryStatus;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at?: string | null;
  failed_at?: string | null;
  webhook_events: WebhookEvent[];
}

interface WebhookEventDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: NotificationLogDetails | null;
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  sent: <Send className="h-4 w-4 text-blue-500" />,
  delivered: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  read: <Eye className="h-4 w-4 text-purple-500" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
  bounced: <AlertCircle className="h-4 w-4 text-orange-500" />,
  complained: <AlertCircle className="h-4 w-4 text-red-500" />,
};

export function WebhookEventDetailsDialog({
  open,
  onOpenChange,
  notification,
}: WebhookEventDetailsDialogProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const dateLocale = isRTL ? ar : enUS;

  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!notification) return null;

  const events = notification.webhook_events || [];

  const toggleEventExpand = (index: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedEvents(newExpanded);
  };

  const copyPayload = (index: number, payload: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const formatEventTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'PPpp', { locale: dateLocale });
    } catch {
      return timestamp;
    }
  };

  const getEventStatusBadge = (event: WebhookEvent) => {
    const status = event.status || event.ack_name || event.event_type;
    const variant = 
      status === 'delivered' || status === 'read' ? 'default' :
      status === 'sent' ? 'secondary' :
      status === 'failed' || status === 'error' ? 'destructive' :
      'outline';

    return (
      <Badge variant={variant} className="text-xs">
        {status}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {statusIcons[notification.status]}
            {isRTL ? 'تفاصيل الإشعار' : 'Notification Details'}
          </DialogTitle>
          <DialogDescription>
            {notification.provider_message_id || notification.id}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timeline">
              {isRTL ? 'الجدول الزمني' : 'Timeline'}
            </TabsTrigger>
            <TabsTrigger value="details">
              {isRTL ? 'التفاصيل' : 'Details'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4">
            <ScrollArea className="h-[400px] pe-4">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Clock className="h-8 w-8 mb-2" />
                  <p>{isRTL ? 'لا توجد أحداث بعد' : 'No events yet'}</p>
                  <p className="text-xs mt-1">
                    {isRTL 
                      ? 'ستظهر الأحداث عند تلقي تحديثات من مزود الخدمة' 
                      : 'Events will appear when status updates are received'}
                  </p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute start-3 top-0 bottom-0 w-0.5 bg-border" />

                  <div className="space-y-4">
                    {events.map((event, index) => (
                      <div key={index} className="relative ps-8">
                        {/* Timeline dot */}
                        <div className="absolute start-0 top-1 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center">
                          {statusIcons[event.status || 'pending']}
                        </div>

                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {getEventStatusBadge(event)}
                              <span className="text-sm font-medium">
                                {event.event_type}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatEventTime(event.received_at)}
                            </span>
                          </div>

                          {(event.error_code || event.error_message || event.error) && (
                            <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                              {event.error_code && (
                                <span className="font-mono">[{event.error_code}] </span>
                              )}
                              {event.error_message || event.error}
                            </div>
                          )}

                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleEventExpand(index)}
                              className="h-6 px-2 text-xs"
                            >
                              {expandedEvents.has(index) ? (
                                <>
                                  <ChevronUp className="h-3 w-3 me-1" />
                                  {isRTL ? 'إخفاء البيانات' : 'Hide Payload'}
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3 me-1" />
                                  {isRTL ? 'عرض البيانات' : 'Show Payload'}
                                </>
                              )}
                            </Button>

                            {event.raw_payload && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyPayload(index, event.raw_payload)}
                                className="h-6 px-2 text-xs"
                              >
                                {copiedIndex === index ? (
                                  <>
                                    <Check className="h-3 w-3 me-1" />
                                    {isRTL ? 'تم النسخ' : 'Copied'}
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3 me-1" />
                                    {isRTL ? 'نسخ' : 'Copy'}
                                  </>
                                )}
                              </Button>
                            )}
                          </div>

                          {expandedEvents.has(index) && event.raw_payload && (
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto max-h-48 font-mono">
                              {JSON.stringify(event.raw_payload, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      {isRTL ? 'القناة' : 'Channel'}
                    </label>
                    <p className="font-medium capitalize">{notification.channel}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      {isRTL ? 'المزود' : 'Provider'}
                    </label>
                    <p className="font-medium capitalize">{notification.provider}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      {isRTL ? 'المستلم' : 'Recipient'}
                    </label>
                    <p className="font-mono text-sm">{notification.to_address}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      {isRTL ? 'الحالة' : 'Status'}
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      {statusIcons[notification.status]}
                      <span className="capitalize">{notification.status}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">
                    {isRTL ? 'التوقيتات' : 'Timestamps'}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {isRTL ? 'تم الإنشاء' : 'Created'}
                      </span>
                      <span>{formatEventTime(notification.created_at)}</span>
                    </div>
                    {notification.sent_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {isRTL ? 'تم الإرسال' : 'Sent'}
                        </span>
                        <span>{formatEventTime(notification.sent_at)}</span>
                      </div>
                    )}
                    {notification.delivered_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {isRTL ? 'تم التسليم' : 'Delivered'}
                        </span>
                        <span>{formatEventTime(notification.delivered_at)}</span>
                      </div>
                    )}
                    {notification.read_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {isRTL ? 'تمت القراءة' : 'Read'}
                        </span>
                        <span>{formatEventTime(notification.read_at)}</span>
                      </div>
                    )}
                    {notification.failed_at && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-destructive">
                          {isRTL ? 'فشل' : 'Failed'}
                        </span>
                        <span className="text-destructive">
                          {formatEventTime(notification.failed_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {(notification.error_code || notification.error_message) && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-2 text-destructive">
                      {isRTL ? 'تفاصيل الخطأ' : 'Error Details'}
                    </h4>
                    <div className="bg-destructive/10 p-3 rounded-lg">
                      {notification.error_code && (
                        <p className="font-mono text-sm">
                          {isRTL ? 'الرمز:' : 'Code:'} {notification.error_code}
                        </p>
                      )}
                      {notification.error_message && (
                        <p className="text-sm mt-1">{notification.error_message}</p>
                      )}
                    </div>
                  </div>
                )}

                {notification.provider_message_id && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">
                      {isRTL ? 'معرف الرسالة' : 'Message ID'}
                    </h4>
                    <p className="font-mono text-xs bg-muted p-2 rounded break-all">
                      {notification.provider_message_id}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
