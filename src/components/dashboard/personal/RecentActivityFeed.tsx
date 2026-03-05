import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Eye, CheckCircle, Clock, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  type: 'incident' | 'observation' | 'action';
  title: string;
  status: string;
  created_at: string;
  reference_id?: string;
}

interface RawActivityRow {
  id: string;
  title: string | null;
  status: string | null;
  created_at: string;
  reference_id: string | null;
}

async function fetchMyActivity(userId: string): Promise<ActivityItem[]> {
  // Use type assertions to bypass deep type instantiation issues
  const client = supabase as unknown;

  const [incidentsRes, actionsRes, observationsRes] = await Promise.all([
    (client as any).from('incidents')
      .select('id, title, status, created_at, reference_id')
      .eq('reported_by', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(3),
    (client as any).from('corrective_actions')
      .select('id, title, status, created_at, reference_id')
      .eq('assigned_to', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(3),
    (client as any).from('observations')
      .select('id, title, status, created_at, reference_id')
      .eq('reported_by', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(3)
      .then((res: { data: unknown[] | null }) => res)
      .catch(() => ({ data: [] })),
  ]);

  const incidents = (incidentsRes.data || []) as RawActivityRow[];
  const actions = (actionsRes.data || []) as RawActivityRow[];
  const observations = (observationsRes.data || []) as RawActivityRow[];

  const combined: ActivityItem[] = [
    ...incidents.map(i => ({
      id: i.id,
      title: i.title || '',
      status: i.status || '',
      created_at: i.created_at,
      reference_id: i.reference_id || undefined,
      type: 'incident' as const,
    })),
    ...observations.map(o => ({
      id: o.id,
      title: o.title || '',
      status: o.status || '',
      created_at: o.created_at,
      reference_id: o.reference_id || undefined,
      type: 'observation' as const,
    })),
    ...actions.map(a => ({
      id: a.id,
      title: a.title || '',
      status: a.status || '',
      created_at: a.created_at,
      reference_id: a.reference_id || undefined,
      type: 'action' as const,
    })),
  ];

  return combined
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
}

export function RecentActivityFeed() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const isArabic = i18n.language === 'ar';

  const { data: activities, isLoading } = useQuery({
    queryKey: ['my-recent-activity', user?.id],
    queryFn: () => fetchMyActivity(user!.id),
    enabled: isAuthenticated && !!user?.id,
    staleTime: 60 * 1000,
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'incident': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'observation': return <Eye className="h-4 w-4 text-info" />;
      case 'action': return <CheckCircle className="h-4 w-4 text-success" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      incident: t('dashboard.activity.incident', 'Incident'),
      observation: t('dashboard.activity.observation', 'Observation'),
      action: t('dashboard.activity.action', 'Action'),
    };
    const variants: Record<string, 'destructive' | 'default' | 'secondary'> = {
      incident: 'destructive',
      observation: 'default',
      action: 'secondary',
    };
    return (
      <Badge variant={variants[type] || 'default'} className="text-[10px] px-1.5 py-0">
        {labels[type]}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!activities?.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t('dashboard.activity.title', 'Recent Activity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            {t('dashboard.activity.empty', 'No recent activity.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {t('dashboard.activity.title', 'Recent Activity')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {activities.map((activity) => (
          <div
            key={`${activity.type}-${activity.id}`}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="mt-0.5">{getIcon(activity.type)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                {getTypeBadge(activity.type)}
                {activity.reference_id && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {activity.reference_id}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium truncate">{activity.title}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(activity.created_at), {
                  addSuffix: true,
                  locale: isArabic ? ar : enUS,
                })}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
