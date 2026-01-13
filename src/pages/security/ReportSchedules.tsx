import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Plus, Mail, Clock, Trash2, Play, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { EnterprisePage } from '@/components/layout/EnterprisePage';

interface ReportConfig {
  id: string;
  report_name: string;
  report_name_ar: string | null;
  report_type: string;
  schedule_cron: string;
  recipients: string[];
  recipient_roles: string[];
  is_active: boolean;
  last_generated_at: string | null;
  created_at: string;
}

function parseCronToHuman(cron: string): string {
  const parts = cron.split(' ');
  if (parts.length < 5) return cron;
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  if (dayOfWeek !== '*' && dayOfMonth === '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `Weekly on ${days[parseInt(dayOfWeek)] || dayOfWeek} at ${hour}:${minute.padStart(2, '0')}`;
  }
  if (dayOfMonth !== '*') {
    return `Monthly on day ${dayOfMonth} at ${hour}:${minute.padStart(2, '0')}`;
  }
  return `Daily at ${hour}:${minute.padStart(2, '0')}`;
}

export default function ReportSchedules() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configs, isLoading } = useQuery({
    queryKey: ['security-report-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_report_configs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ReportConfig[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('security_report_configs')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-report-configs'] });
      toast({ title: t('common.saved', 'Saved') });
    },
  });

  const triggerNow = useMutation({
    mutationFn: async (configId: string) => {
      const { error } = await supabase.functions.invoke('generate-scheduled-security-report', {
        body: { configId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-report-configs'] });
      toast({ title: t('security.reports.triggered', 'Report generation triggered') });
    },
    onError: () => {
      toast({ title: t('common.error', 'Error'), variant: 'destructive' });
    },
  });

  return (
    <EnterprisePage
      title={t('security.reportSchedules', 'Report Schedules')}
      description={t('security.reportSchedulesDesc', 'Configure automated security performance reports sent to supervisors')}
      primaryAction={{
        label: t('security.reports.newSchedule', 'New Schedule'),
        icon: Plus,
        onClick: () => toast({ title: 'Coming soon', description: 'Schedule creation dialog will be added' }),
      }}
    >
      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : configs?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('security.reports.noSchedules', 'No scheduled reports configured')}</p>
            <Button className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              {t('security.reports.createFirst', 'Create your first schedule')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {configs?.map((config) => (
            <Card key={config.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{config.report_name}</h3>
                      <Badge variant={config.is_active ? 'default' : 'secondary'}>
                        {config.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                      </Badge>
                      <Badge variant="outline">{config.report_type}</Badge>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {parseCronToHuman(config.schedule_cron)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        {config.recipients.length} recipient{config.recipients.length !== 1 ? 's' : ''}
                        {config.recipient_roles.length > 0 && ` + ${config.recipient_roles.length} role(s)`}
                      </div>
                      {config.last_generated_at && (
                        <span>
                          Last: {format(new Date(config.last_generated_at), 'PPp')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.is_active}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: config.id, isActive: checked })}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerNow.mutate(config.id)}
                      disabled={triggerNow.isPending}
                    >
                      <Play className="h-3.5 w-3.5 me-1" />
                      {t('security.reports.runNow', 'Run Now')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </EnterprisePage>
  );
}
