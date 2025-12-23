/**
 * Notification Log Viewer
 * Real-time view of auto_notification_logs with filtering
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bell, 
  RefreshCw, 
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Mail,
  Smartphone,
  Search,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface NotificationLog {
  id: string;
  event_id: string;
  event_type: string;
  channel: string;
  status: string;
  stakeholder_role: string | null;
  recipient_phone: string | null;
  message_content: string | null;
  error_message: string | null;
  provider_message_id: string | null;
  severity_level: string | null;
  was_erp_override: boolean | null;
  sent_at: string | null;
  created_at: string;
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="h-4 w-4 text-green-500" />,
  email: <Mail className="h-4 w-4 text-blue-500" />,
  push: <Smartphone className="h-4 w-4 text-purple-500" />,
  in_app: <Bell className="h-4 w-4 text-amber-500" />,
};

const STATUS_BADGES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  sent: { variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  delivered: { variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  pending: { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  failed: { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  queued: { variant: 'outline', icon: <Clock className="h-3 w-3" /> },
};

export function NotificationLogViewer() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const isRTL = i18n.language === 'ar';
  
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch notification logs
  const { data: logs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notification-logs', profile?.tenant_id, channelFilter, statusFilter],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      let query = supabase
        .from('auto_notification_logs')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (channelFilter !== 'all') {
        query = query.eq('channel', channelFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as NotificationLog[];
    },
    enabled: !!profile?.tenant_id,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Filter logs by search query
  const filteredLogs = logs?.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.event_id?.toLowerCase().includes(query) ||
      log.stakeholder_role?.toLowerCase().includes(query) ||
      log.recipient_phone?.includes(query) ||
      log.message_content?.toLowerCase().includes(query)
    );
  });

  // Stats
  const stats = {
    total: logs?.length || 0,
    whatsapp: logs?.filter(l => l.channel === 'whatsapp').length || 0,
    sent: logs?.filter(l => l.status === 'sent' || l.status === 'delivered').length || 0,
    failed: logs?.filter(l => l.status === 'failed').length || 0,
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'الإجمالي' : 'Total'}
                </p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'واتساب' : 'WhatsApp'}
                </p>
                <p className="text-2xl font-bold text-green-600">{stats.whatsapp}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'تم الإرسال' : 'Sent'}
                </p>
                <p className="text-2xl font-bold text-primary">{stats.sent}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'فشل' : 'Failed'}
                </p>
                <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {isRTL ? 'سجل الإشعارات' : 'Notification Logs'}
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <RefreshCw className="h-4 w-4 me-2" />
              )}
              {isRTL ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRTL ? 'بحث...' : 'Search...'}
                className="ps-10"
              />
            </div>

            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder={isRTL ? 'القناة' : 'Channel'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'الكل' : 'All Channels'}</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="push">Push</SelectItem>
                <SelectItem value="in_app">In-App</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder={isRTL ? 'الحالة' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isRTL ? 'الكل' : 'All Statuses'}</SelectItem>
                <SelectItem value="sent">{isRTL ? 'تم الإرسال' : 'Sent'}</SelectItem>
                <SelectItem value="delivered">{isRTL ? 'تم التسليم' : 'Delivered'}</SelectItem>
                <SelectItem value="pending">{isRTL ? 'قيد الانتظار' : 'Pending'}</SelectItem>
                <SelectItem value="failed">{isRTL ? 'فشل' : 'Failed'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs List */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredLogs.map((log) => {
                const statusConfig = STATUS_BADGES[log.status] || STATUS_BADGES.pending;
                
                return (
                  <div 
                    key={log.id}
                    className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      {/* Channel & Status */}
                      <div className="flex items-center gap-2">
                        {CHANNEL_ICONS[log.channel] || <Bell className="h-4 w-4" />}
                        <Badge variant={statusConfig.variant} className="gap-1">
                          {statusConfig.icon}
                          {log.status}
                        </Badge>
                      </div>

                      {/* Role & Phone */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {log.stakeholder_role || 'Unknown'}
                        </p>
                        {log.recipient_phone && (
                          <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                            {log.recipient_phone}
                          </p>
                        )}
                      </div>

                      {/* Severity & Time */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {log.severity_level && (
                          <Badge variant="outline" className="text-xs">
                            {log.severity_level.replace('level_', 'L')}
                          </Badge>
                        )}
                        {log.was_erp_override && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-500">
                            ERP
                          </Badge>
                        )}
                        <span className="text-xs">
                          {format(
                            new Date(log.created_at), 
                            'HH:mm:ss', 
                            { locale: isRTL ? ar : enUS }
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Error Message */}
                    {log.error_message && (
                      <div className="mt-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
                        {log.error_message}
                      </div>
                    )}

                    {/* Message Preview */}
                    {log.message_content && (
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                        {log.message_content}
                      </p>
                    )}

                    {/* Provider ID */}
                    {log.provider_message_id && (
                      <p className="mt-1 text-xs font-mono text-muted-foreground/70">
                        ID: {log.provider_message_id}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{isRTL ? 'لا توجد سجلات' : 'No logs found'}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
