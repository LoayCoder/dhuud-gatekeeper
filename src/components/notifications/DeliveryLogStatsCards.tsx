import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Send, 
  CheckCircle2, 
  XCircle, 
  Clock,
  MessageSquare,
  Mail,
  Bell,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DeliveryLogStats } from '@/hooks/use-notification-delivery-logs';

interface DeliveryLogStatsCardsProps {
  stats: DeliveryLogStats;
  loading?: boolean;
}

export function DeliveryLogStatsCards({ stats, loading }: DeliveryLogStatsCardsProps) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const statCards = [
    {
      label: isRTL ? 'إجمالي الإشعارات' : 'Total Notifications',
      value: stats.total,
      icon: Send,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: isRTL ? 'معدل النجاح' : 'Success Rate',
      value: `${stats.successRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: isRTL ? 'تم التسليم' : 'Delivered',
      value: stats.delivered,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      label: isRTL ? 'فشل' : 'Failed',
      value: stats.failed,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    whatsapp: MessageSquare,
    email: Mail,
    push: Bell,
  };

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className={cn("transition-opacity", loading && "opacity-50")}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Channel Breakdown */}
      {Object.keys(stats.byChannel).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.byChannel).map(([channel, count]) => {
            const Icon = channelIcons[channel] || Send;
            return (
              <div
                key={channel}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full text-sm"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{channel}</span>
                <span className="font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
