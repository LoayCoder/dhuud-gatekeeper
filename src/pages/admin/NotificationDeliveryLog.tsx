import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DeliveryStatusBadge, type DeliveryStatus } from "@/components/notifications/DeliveryStatusBadge";
import { ChannelIcon, type NotificationChannel } from "@/components/notifications/ChannelIcon";
import { WebhookEventDetailsDialog } from "@/components/notifications/WebhookEventDetailsDialog";
import { RefreshCw, Search, Filter, AlertCircle, Clock, Info, ExternalLink, Copy, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { toast } from "sonner";

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

interface NotificationLog {
  id: string;
  channel: NotificationChannel;
  provider: string;
  provider_message_id: string | null;
  to_address: string;
  template_name: string | null;
  subject: string | null;
  status: DeliveryStatus;
  is_final: boolean;
  error_code: string | null;
  error_message: string | null;
  related_entity_type: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  read_at?: string | null;
  failed_at?: string | null;
  webhook_events: WebhookEvent[];
}

const WEBHOOK_URL = "https://xdlowvfzhvjzbtgvurzj.supabase.co/functions/v1/webhook-notification-status";

export default function NotificationDeliveryLog() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const dateLocale = isRTL ? ar : enUS;
  
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotification, setSelectedNotification] = useState<NotificationLog | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [webhookUrlCopied, setWebhookUrlCopied] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('notification_logs')
        .select('id, channel, provider, provider_message_id, to_address, template_name, subject, status, is_final, error_code, error_message, related_entity_type, created_at, sent_at, delivered_at, read_at, failed_at, webhook_events')
        .order('created_at', { ascending: false })
        .limit(100);

      if (channelFilter !== 'all') {
        query = query.eq('channel', channelFilter);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (searchQuery) {
        query = query.ilike('to_address', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notification logs:', error);
        return;
      }

      // Cast with proper type handling for webhook_events
      const typedLogs = (data || []).map(log => ({
        ...log,
        webhook_events: (log.webhook_events || []) as unknown as WebhookEvent[],
      })) as NotificationLog[];
      setLogs(typedLogs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('notification_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_logs',
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelFilter, statusFilter, searchQuery]);

  const maskAddress = (address: string): string => {
    if (!address) return '-';
    // For phone numbers
    if (address.includes('whatsapp:') || address.startsWith('+')) {
      const cleaned = address.replace('whatsapp:', '');
      if (cleaned.length > 6) {
        return cleaned.substring(0, 4) + '****' + cleaned.substring(cleaned.length - 2);
      }
      return cleaned;
    }
    // For emails
    if (address.includes('@')) {
      const [local, domain] = address.split('@');
      if (local.length > 2) {
        return local.substring(0, 2) + '***@' + domain;
      }
      return '***@' + domain;
    }
    return address;
  };

  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return '-';
    return formatDistanceToNow(new Date(timestamp), { 
      addSuffix: true,
      locale: dateLocale 
    });
  };

  const handleViewDetails = (log: NotificationLog) => {
    setSelectedNotification(log);
    setDetailsDialogOpen(true);
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    setWebhookUrlCopied(true);
    toast.success(isRTL ? 'تم نسخ الرابط' : 'URL copied');
    setTimeout(() => setWebhookUrlCopied(false), 2000);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Webhook URL Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            {isRTL ? 'رابط Webhook للإشعارات' : 'Notification Webhook URL'}
          </CardTitle>
          <CardDescription className="text-xs">
            {isRTL 
              ? 'استخدم هذا الرابط في إعدادات WAHA أو Twilio أو Resend لتلقي تحديثات حالة التسليم' 
              : 'Use this URL in WAHA, Twilio, or Resend settings to receive delivery status updates'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted px-3 py-2 rounded-md text-xs font-mono overflow-x-auto">
              {WEBHOOK_URL}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={copyWebhookUrl}
              className="shrink-0"
            >
              {webhookUrlCopied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {isRTL ? 'سجل تسليم الإشعارات' : 'Notification Delivery Log'}
              </CardTitle>
              <CardDescription>
                {isRTL 
                  ? 'تتبع حالة تسليم جميع الإشعارات المرسلة عبر واتساب والبريد الإلكتروني' 
                  : 'Track delivery status of all notifications sent via WhatsApp and Email'}
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 me-2 ${loading ? 'animate-spin' : ''}`} />
              {isRTL ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isRTL ? 'بحث بالمستلم...' : 'Search by recipient...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9"
              />
            </div>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 me-2" />
                <SelectValue placeholder={isRTL ? 'القناة' : 'Channel'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'جميع القنوات' : 'All Channels'}</SelectItem>
                <SelectItem value="whatsapp">{isRTL ? 'واتساب' : 'WhatsApp'}</SelectItem>
                <SelectItem value="email">{isRTL ? 'البريد' : 'Email'}</SelectItem>
                <SelectItem value="sms">{isRTL ? 'رسالة نصية' : 'SMS'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={isRTL ? 'الحالة' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                <SelectItem value="pending">{isRTL ? 'قيد الانتظار' : 'Pending'}</SelectItem>
                <SelectItem value="sent">{isRTL ? 'تم الإرسال' : 'Sent'}</SelectItem>
                <SelectItem value="delivered">{isRTL ? 'تم التسليم' : 'Delivered'}</SelectItem>
                <SelectItem value="read">{isRTL ? 'مقروء' : 'Read'}</SelectItem>
                <SelectItem value="failed">{isRTL ? 'فشل' : 'Failed'}</SelectItem>
                <SelectItem value="bounced">{isRTL ? 'مرتد' : 'Bounced'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <ScrollArea className="h-[600px] rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-[80px]">{isRTL ? 'القناة' : 'Channel'}</TableHead>
                  <TableHead>{isRTL ? 'المستلم' : 'Recipient'}</TableHead>
                  <TableHead>{isRTL ? 'القالب/الموضوع' : 'Template/Subject'}</TableHead>
                  <TableHead className="w-[120px]">{isRTL ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{isRTL ? 'الوقت' : 'Time'}</TableHead>
                  <TableHead className="w-[80px]">{isRTL ? 'الأحداث' : 'Events'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {loading 
                        ? (isRTL ? 'جارٍ التحميل...' : 'Loading...') 
                        : (isRTL ? 'لا توجد سجلات' : 'No logs found')}
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <ChannelIcon channel={log.channel} size="md" />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {maskAddress(log.to_address)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {log.subject || log.template_name || '-'}
                      </TableCell>
                      <TableCell>
                        <DeliveryStatusBadge status={log.status} size="sm" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTimestamp(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {/* Event count badge */}
                          {log.webhook_events && log.webhook_events.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => handleViewDetails(log)}
                            >
                              {log.webhook_events.length}
                            </Button>
                          )}

                          {/* Error/Info icon - clickable */}
                          {(log.error_code || log.error_message) ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-destructive/10"
                              onClick={() => handleViewDetails(log)}
                            >
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          ) : log.is_final && log.status === 'delivered' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-green-500/10"
                              onClick={() => handleViewDetails(log)}
                            >
                              <Info className="h-4 w-4 text-green-500" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleViewDetails(log)}
                            >
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <WebhookEventDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        notification={selectedNotification}
      />
    </div>
  );
}
