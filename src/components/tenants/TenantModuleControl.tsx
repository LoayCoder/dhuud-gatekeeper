import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Shield, Package, Lock } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

interface TenantModuleControlProps {
  tenant: Tables<'tenants'>;
}

interface ModuleWithStatus {
  module_id: string;
  module_code: string;
  module_name: string;
  is_enabled: boolean;
  source: 'override' | 'plan' | 'none';
}

export function TenantModuleControl({ tenant }: TenantModuleControlProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updatingModules, setUpdatingModules] = useState<Set<string>>(new Set());

  // Fetch modules with tenant-specific status
  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['tenant-modules-with-overrides', tenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_tenant_modules_with_overrides', { p_tenant_id: tenant.id });
      if (error) throw error;
      return data as ModuleWithStatus[];
    },
  });

  // Toggle module mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ moduleId, enabled }: { moduleId: string; enabled: boolean }) => {
      // Check if override exists
      const { data: existingOverride } = await supabase
        .from('tenant_modules')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('module_id', moduleId)
        .maybeSingle();

      if (existingOverride) {
        // Update existing override
        const { error } = await supabase
          .from('tenant_modules')
          .update({
            enabled,
            ...(enabled 
              ? { enabled_at: new Date().toISOString(), disabled_at: null }
              : { disabled_at: new Date().toISOString() }
            ),
          })
          .eq('id', existingOverride.id);
        if (error) throw error;
      } else {
        // Create new override
        const { error } = await supabase
          .from('tenant_modules')
          .insert({
            tenant_id: tenant.id,
            module_id: moduleId,
            enabled,
            ...(enabled 
              ? { enabled_at: new Date().toISOString() }
              : { disabled_at: new Date().toISOString() }
            ),
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-modules-with-overrides', tenant.id] });
      toast({
        title: t('tenantManagement.modules.updated'),
        description: t('tenantManagement.modules.updatedDesc'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleToggle = async (moduleId: string, currentEnabled: boolean) => {
    setUpdatingModules(prev => new Set(prev).add(moduleId));
    try {
      await toggleMutation.mutateAsync({ moduleId, enabled: !currentEnabled });
    } finally {
      setUpdatingModules(prev => {
        const next = new Set(prev);
        next.delete(moduleId);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Shield className="h-4 w-4" />
        <span>{t('tenantManagement.modules.description')}</span>
      </div>

      <div className="space-y-3">
        {modules.map((module) => {
          const isUpdating = updatingModules.has(module.module_id);
          
          return (
            <div
              key={module.module_id}
              className="flex items-center justify-between p-4 border rounded-lg bg-card"
            >
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{module.module_name}</span>
                    {module.source === 'override' && (
                      <Badge variant="outline" className="text-xs">
                        {t('tenantManagement.modules.override')}
                      </Badge>
                    )}
                    {module.source === 'plan' && (
                      <Badge variant="secondary" className="text-xs">
                        {t('tenantManagement.modules.fromPlan')}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{module.module_code}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {module.module_code === 'hsse_core' ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm">{t('tenantManagement.modules.required')}</span>
                  </div>
                ) : (
                  <Switch
                    checked={module.is_enabled}
                    onCheckedChange={() => handleToggle(module.module_id, module.is_enabled)}
                    disabled={isUpdating}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
