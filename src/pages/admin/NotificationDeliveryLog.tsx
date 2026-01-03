import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DeliveryStatusBadge } from "@/components/notifications/DeliveryStatusBadge";
import { ChannelIcon } from "@/components/notifications/ChannelIcon";
import { DeliveryLogStatsCards } from "@/components/notifications/DeliveryLogStatsCards";
import { DeliveryLogDetailDialog } from "@/components/notifications/DeliveryLogDetailDialog";
import { WhatsAppSettings } from "@/components/admin/WhatsAppSettings";
import { 
  useNotificationDeliveryLogs, 
  type NotificationSource,
  type UnifiedNotificationLog 
} from "@/hooks/use-notification-delivery-logs";
import { 
  RefreshCw, 
  Search, 
  Filter, 
  AlertCircle, 
  Clock, 
  Info, 
  ExternalLink, 
  Copy, 
  Check, 
  MessageSquare, 
  FileText,
  Zap,
  BellOff,
  ShieldAlert
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { toast } from "sonner";

const WEBHOOK_URL = "https://xdlowvfzhvjzbtgvurzj.supabase.co/functions/v1/webhook-notification-status";

const SEVERITY_COLORS: Record<string, string> = {
  'level_1': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'level_2': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'level_3': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'level_4': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'level_5': 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};

const HSSE_PRIORITY_COLORS: Record<string, string> = {
  'critical': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'high': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'medium': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'low': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const RECIPIENT_TYPE_ICONS: Record<string, string> = {
  'employee': '👤',
  'worker': '🔧',
  'visitor': '👥',
};

export default function NotificationDeliveryLog() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const dateLocale = isRTL ? ar : enUS;
  
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<NotificationSource>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<UnifiedNotificationLog | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [webhookUrlCopied, setWebhookUrlCopied] = useState(false);

  const { logs, stats, loading, refetch } = useNotificationDeliveryLogs({
    channelFilter,
    statusFilter,
    sourceFilter,
    searchQuery,
  });

  const maskAddress = (address: string): string => {
    if (!address) return '-';
    if (address.includes('whatsapp:') || address.startsWith('+')) {
      const cleaned = address.replace('whatsapp:', '');
      if (cleaned.length > 6) {
        return cleaned.substring(0, 4) + '****' + cleaned.substring(cleaned.length - 2);
      }
      return cleaned;
    }
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

  const handleViewDetails = (log: UnifiedNotificationLog) => {
    setSelectedLog(log);
    setDetailsDialogOpen(true);
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    setWebhookUrlCopied(true);
    toast.success(isRTL ? 'تم نسخ الرابط' : 'URL copied');
    setTimeout(() => setWebhookUrlCopied(false), 2000);
  };

  const handleSourceTabChange = (value: string) => {
    setSourceFilter(value as NotificationSource);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Tabs defaultValue="delivery-log" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="delivery-log" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {isRTL ? "سجل التسليم" : "Delivery Log"}
          </TabsTrigger>
          <TabsTrigger value="whatsapp-settings" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {isRTL ? "إعدادات واتساب" : "WhatsApp Settings"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="delivery-log" className="mt-6 space-y-6">
          {/* Stats Cards */}
          <DeliveryLogStatsCards stats={stats} loading={loading} />

          {/* Webhook URL Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                {isRTL ? 'رابط Webhook للإشعارات' : 'Notification Webhook URL'}
              </CardTitle>
              <CardDescription className="text-xs">
                {isRTL 
                  ? 'استخدم هذا الرابط في إعدادات مزود الواتساب لتلقي تحديثات حالة التسليم' 
                  : 'Use this URL in your WhatsApp provider settings to receive delivery status updates'}
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

          {/* Main Log Card */}
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
                      ? 'تتبع حالة تسليم جميع الإشعارات المرسلة' 
                      : 'Track delivery status of all sent notifications'}
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refetch}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 me-2 ${loading ? 'animate-spin' : ''}`} />
                  {isRTL ? 'تحديث' : 'Refresh'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Source Tabs */}
              <Tabs value={sourceFilter} onValueChange={handleSourceTabChange}>
                <TabsList>
                  <TabsTrigger value="all" className="gap-1.5">
                    {isRTL ? 'الكل' : 'All'}
                  </TabsTrigger>
                  <TabsTrigger value="hsse" className="gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {isRTL ? 'الصحة والسلامة' : 'HSSE'}
                  </TabsTrigger>
                  <TabsTrigger value="incident" className="gap-1.5">
                    <Zap className="h-3.5 w-3.5" />
                    {isRTL ? 'الحوادث' : 'Incidents'}
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {isRTL ? 'يدوي' : 'Manual'}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
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
                  <SelectTrigger className="w-[140px]">
                    <Filter className="h-4 w-4 me-2" />
                    <SelectValue placeholder={isRTL ? 'القناة' : 'Channel'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'جميع القنوات' : 'All Channels'}</SelectItem>
                    <SelectItem value="whatsapp">{isRTL ? 'واتساب' : 'WhatsApp'}</SelectItem>
                    <SelectItem value="email">{isRTL ? 'البريد' : 'Email'}</SelectItem>
                    <SelectItem value="push">{isRTL ? 'إشعار' : 'Push'}</SelectItem>
                    <SelectItem value="sms">{isRTL ? 'رسالة نصية' : 'SMS'}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder={isRTL ? 'الحالة' : 'Status'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                    <SelectItem value="pending">{isRTL ? 'قيد الانتظار' : 'Pending'}</SelectItem>
                    <SelectItem value="sent">{isRTL ? 'تم الإرسال' : 'Sent'}</SelectItem>
                    <SelectItem value="delivered">{isRTL ? 'تم التسليم' : 'Delivered'}</SelectItem>
                    <SelectItem value="read">{isRTL ? 'مقروء' : 'Read'}</SelectItem>
                    <SelectItem value="failed">{isRTL ? 'فشل' : 'Failed'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <ScrollArea className="h-[500px] rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-[70px]">{isRTL ? 'القناة' : 'Channel'}</TableHead>
                      <TableHead>{isRTL ? 'المستلم' : 'Recipient'}</TableHead>
                      <TableHead>{isRTL ? 'النوع' : 'Type'}</TableHead>
                      <TableHead className="w-[80px]">{isRTL ? 'المستوى' : 'Severity'}</TableHead>
                      <TableHead className="w-[100px]">{isRTL ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead>{isRTL ? 'الوقت' : 'Time'}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          {loading ? (
                            <div className="flex flex-col items-center gap-2">
                              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {isRTL ? 'جارٍ التحميل...' : 'Loading...'}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <BellOff className="h-10 w-10 text-muted-foreground/40" />
                              <span className="text-muted-foreground">
                                {isRTL ? 'لا توجد سجلات' : 'No notifications found'}
                              </span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow 
                          key={`${log.source}-${log.id}`} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleViewDetails(log)}
                        >
                          <TableCell>
                            <ChannelIcon channel={log.channel} size="sm" />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {maskAddress(log.recipient)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={log.source === 'incident' ? 'default' : log.source === 'hsse' ? 'outline' : 'secondary'}
                                className={`text-xs ${log.source === 'hsse' ? 'border-amber-500 text-amber-700 dark:text-amber-400' : ''}`}
                              >
                                {log.source === 'incident' 
                                  ? (isRTL ? 'حادثة' : 'Incident')
                                  : log.source === 'hsse'
                                    ? (isRTL ? 'صحة وسلامة' : 'HSSE')
                                    : (isRTL ? 'يدوي' : 'Manual')
                                }
                              </Badge>
                              {log.stakeholder_role && (
                                <span className="text-xs text-muted-foreground capitalize truncate max-w-[100px]">
                                  {log.stakeholder_role.replace(/_/g, ' ')}
                                </span>
                              )}
                              {log.source === 'hsse' && log.recipient_type && (
                                <span className="text-xs" title={log.recipient_type}>
                                  {RECIPIENT_TYPE_ICONS[log.recipient_type] || ''}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.severity_level ? (
                              <Badge 
                                variant="secondary"
                                className={`text-xs ${SEVERITY_COLORS[log.severity_level] || ''}`}
                              >
                                {log.severity_level.replace('level_', 'L')}
                              </Badge>
                            ) : log.hsse_priority ? (
                              <Badge 
                                variant="secondary"
                                className={`text-xs ${HSSE_PRIORITY_COLORS[log.hsse_priority] || ''}`}
                              >
                                {log.hsse_priority.charAt(0).toUpperCase() + log.hsse_priority.slice(1)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DeliveryStatusBadge status={log.status} size="sm" />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatTimestamp(log.created_at)}
                          </TableCell>
                          <TableCell>
                            {log.error_message ? (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            ) : (
                              <Info className="h-4 w-4 text-muted-foreground/50" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp-settings" className="mt-6">
          <WhatsAppSettings />
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <DeliveryLogDetailDialog
        log={selectedLog}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </div>
  );
}
