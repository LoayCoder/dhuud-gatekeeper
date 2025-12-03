import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Clock, 
  CreditCard, 
  Users, 
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";

interface SubscriptionEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  description: string | null;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  performed_by: string | null;
  created_at: string;
  tenants?: { name: string } | null;
}

interface SubscriptionAuditLogProps {
  tenantId?: string;
  limit?: number;
  showTenantName?: boolean;
}

export function SubscriptionAuditLog({ tenantId, limit = 50, showTenantName = true }: SubscriptionAuditLogProps) {
  const { t } = useTranslation();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['subscription-events', tenantId, limit],
    queryFn: async () => {
      let query = supabase
        .from('subscription_events')
        .select(`
          *,
          tenants (name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SubscriptionEvent[];
    },
  });

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'plan_changed':
        return <ArrowUpCircle className="h-4 w-4 text-primary" />;
      case 'trial_started':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'trial_ended':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'subscription_activated':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'subscription_canceled':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'subscription_renewed':
        return <RefreshCw className="h-4 w-4 text-green-500" />;
      case 'user_limit_changed':
        return <Users className="h-4 w-4 text-primary" />;
      case 'payment_succeeded':
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'payment_failed':
        return <CreditCard className="h-4 w-4 text-destructive" />;
      default:
        return <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'subscription_activated':
      case 'payment_succeeded':
      case 'subscription_renewed':
        return 'default';
      case 'subscription_canceled':
      case 'payment_failed':
        return 'destructive';
      case 'trial_ended':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatEventType = (type: string) => {
    return t(`subscriptionEvents.${type}`, type.replace(/_/g, ' '));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('subscriptionEvents.title')}</CardTitle>
        <CardDescription>{t('subscriptionEvents.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('subscriptionEvents.noEvents')}
          </div>
        ) : (
          <ScrollArea className="h-[400px] pe-4">
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-0.5">
                    {getEventIcon(event.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getEventBadgeVariant(event.event_type)}>
                        {formatEventType(event.event_type)}
                      </Badge>
                      {showTenantName && event.tenants?.name && (
                        <span className="text-sm text-muted-foreground">
                          {event.tenants.name}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-sm mt-1">{event.description}</p>
                    )}
                    {(event.previous_value || event.new_value) && (
                      <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                        {event.previous_value && (
                          <span>
                            {t('subscriptionEvents.from')}: {JSON.stringify(event.previous_value)}
                          </span>
                        )}
                        {event.new_value && (
                          <span>
                            {t('subscriptionEvents.to')}: {JSON.stringify(event.new_value)}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(event.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
