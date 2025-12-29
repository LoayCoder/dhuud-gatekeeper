import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  AlertTriangle,
  Save,
  Loader2,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface EmergencySLAConfig {
  id: string;
  tenant_id: string;
  alert_type: string;
  max_response_seconds: number;
  max_resolution_seconds: number;
  escalation_after_seconds: number;
  second_escalation_after_seconds: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ALERT_TYPES = ['panic', 'security_breach', 'medical', 'fire', 'other'] as const;

export function EmergencySLAConfig() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const queryClient = useQueryClient();

  const [configs, setConfigs] = useState<Record<string, Partial<EmergencySLAConfig>>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: existingConfigs, isLoading } = useQuery({
    queryKey: ['emergency-sla-configs', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_response_sla_configs')
        .select('*')
        .is('deleted_at', null)
        .order('alert_type');

      if (error) throw error;
      return data as EmergencySLAConfig[];
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (existingConfigs) {
      const configMap: Record<string, Partial<EmergencySLAConfig>> = {};
      existingConfigs.forEach((config) => {
        configMap[config.alert_type] = config;
      });
      // Add defaults for missing types
      ALERT_TYPES.forEach((type) => {
        if (!configMap[type]) {
          configMap[type] = {
            alert_type: type,
            max_response_seconds: (type === 'panic' || type === 'fire' ? 2 : 5) * 60,
            max_resolution_seconds: (type === 'panic' || type === 'fire' ? 15 : 30) * 60,
            escalation_after_seconds: (type === 'panic' || type === 'fire' ? 3 : 10) * 60,
            second_escalation_after_seconds: (type === 'panic' || type === 'fire' ? 10 : 20) * 60,
            is_active: true,
          };
        }
      });
      setConfigs(configMap);
    }
  }, [existingConfigs]);

  const saveMutation = useMutation({
    mutationFn: async (configsToSave: Record<string, Partial<EmergencySLAConfig>>) => {
      if (!tenantId) throw new Error('No tenant');

      const operations = Object.values(configsToSave).map(async (config) => {
        const { id, created_at, updated_at, ...data } = config;
        
        if (id) {
          // Update existing
          const { error } = await supabase
            .from('emergency_response_sla_configs')
            .update({
              ...data,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);
          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('emergency_response_sla_configs')
            .insert({
              ...data,
              tenant_id: tenantId,
            } as never);
          if (error) throw error;
        }
      });

      await Promise.all(operations);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-sla-configs'] });
      setHasChanges(false);
      toast({
        title: t('common.saved', 'Saved'),
        description: t('security.slaConfigsSaved', 'SLA configurations have been saved.'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateConfig = (alertType: string, field: string, value: unknown) => {
    setConfigs((prev) => ({
      ...prev,
      [alertType]: {
        ...prev[alertType],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      panic: t('security.alertTypes.panic', 'Panic Button'),
      security_breach: t('security.alertTypes.securityBreach', 'Security Breach'),
      medical: t('security.alertTypes.medical', 'Medical Emergency'),
      fire: t('security.alertTypes.fire', 'Fire'),
      other: t('security.alertTypes.other', 'Other'),
    };
    return labels[type] || type;
  };

  const getAlertTypeBadge = (type: string) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
      panic: 'destructive',
      security_breach: 'default',
      medical: 'destructive',
      fire: 'destructive',
      other: 'secondary',
    };
    return <Badge variant={variants[type] || 'outline'}>{getAlertTypeLabel(type)}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('security.emergencySLAConfig', 'Emergency Response SLA')}
            </CardTitle>
            <CardDescription>
              {t('security.emergencySLAConfigDesc', 'Configure response time targets and escalation rules for emergency alerts')}
            </CardDescription>
          </div>
          <Button
            onClick={() => saveMutation.mutate(configs)}
            disabled={!hasChanges || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 me-2" />
            )}
            {t('common.saveChanges', 'Save Changes')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('security.alertType', 'Alert Type')}</TableHead>
                <TableHead>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        {t('security.responseTarget', 'Response Target')}
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        {t('security.responseTargetTooltip', 'Time to acknowledge the alert')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1">
                        {t('security.resolutionTarget', 'Resolution Target')}
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        {t('security.resolutionTargetTooltip', 'Time to fully resolve the alert')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableHead>
                <TableHead>{t('security.escalation1', 'Escalation 1')}</TableHead>
                <TableHead>{t('security.escalation2', 'Escalation 2')}</TableHead>
                <TableHead>{t('common.active', 'Active')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {ALERT_TYPES.map((type) => {
                const config = configs[type] || {};
                const responseMin = Math.round((config.max_response_seconds ?? 300) / 60);
                const resolutionMin = Math.round((config.max_resolution_seconds ?? 1800) / 60);
                const esc1Min = Math.round((config.escalation_after_seconds ?? 300) / 60);
                const esc2Min = Math.round((config.second_escalation_after_seconds ?? 900) / 60);
                return (
                  <TableRow key={type}>
                    <TableCell>{getAlertTypeBadge(type)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={1}
                          max={60}
                          value={responseMin}
                          onChange={(e) => updateConfig(type, 'max_response_seconds', (parseInt(e.target.value) || 5) * 60)}
                          className="w-16"
                        />
                        <span className="text-sm text-muted-foreground">{t('common.min', 'min')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={5}
                          max={240}
                          value={resolutionMin}
                          onChange={(e) => updateConfig(type, 'max_resolution_seconds', (parseInt(e.target.value) || 30) * 60)}
                          className="w-16"
                        />
                        <span className="text-sm text-muted-foreground">{t('common.min', 'min')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={1}
                          max={60}
                          value={esc1Min}
                          onChange={(e) => updateConfig(type, 'escalation_after_seconds', (parseInt(e.target.value) || 5) * 60)}
                          className="w-16"
                        />
                        <span className="text-sm text-muted-foreground">{t('common.min', 'min')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={5}
                          max={120}
                          value={esc2Min}
                          onChange={(e) => updateConfig(type, 'second_escalation_after_seconds', (parseInt(e.target.value) || 15) * 60)}
                          className="w-16"
                        />
                        <span className="text-sm text-muted-foreground">{t('common.min', 'min')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={config.is_active ?? true}
                        onCheckedChange={(checked) => updateConfig(type, 'is_active', checked)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            {t('security.slaConfigNote', 'Changes to SLA configurations will apply to new alerts only. Existing alerts will maintain their original SLA targets.')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
