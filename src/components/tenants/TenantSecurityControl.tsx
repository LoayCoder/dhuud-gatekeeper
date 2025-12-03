import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, Smartphone } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

interface TenantSecurityControlProps {
  tenant: Tables<'tenants'>;
}

export function TenantSecurityControl({ tenant }: TenantSecurityControlProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [mfaTrustDays, setMfaTrustDays] = useState(
    String(tenant.mfa_trust_duration_days ?? 15)
  );

  const updateSecurityMutation = useMutation({
    mutationFn: async (updates: Partial<Tables<'tenants'>>) => {
      const { error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', tenant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: t('tenantManagement.security.updated'),
        description: t('tenantManagement.security.updatedDesc'),
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

  const handleSaveMfaTrustDuration = () => {
    const days = parseInt(mfaTrustDays) || 15;
    if (days < 1 || days > 365) {
      toast({
        title: t('common.error'),
        description: t('tenantManagement.security.invalidDuration'),
        variant: 'destructive',
      });
      return;
    }
    
    updateSecurityMutation.mutate({
      mfa_trust_duration_days: days,
    });
  };

  const currentValue = tenant.mfa_trust_duration_days ?? 15;
  const hasChanges = parseInt(mfaTrustDays) !== currentValue;

  return (
    <div className="space-y-6">
      {/* MFA Trust Duration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            {t('tenantManagement.security.mfaTrustDuration')}
          </CardTitle>
          <CardDescription>
            {t('tenantManagement.security.mfaTrustDurationDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-trust-days">
              {t('tenantManagement.security.trustDurationLabel')}
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                id="mfa-trust-days"
                type="number"
                min={1}
                max={365}
                value={mfaTrustDays}
                onChange={(e) => setMfaTrustDays(e.target.value)}
                className="w-24"
              />
              <span className="text-muted-foreground">
                {t('tenantManagement.trial.days')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('tenantManagement.security.trustDurationHelp')}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              {t('tenantManagement.security.currentSetting')}: {currentValue} {t('tenantManagement.trial.days')}
            </div>
            <Button
              onClick={handleSaveMfaTrustDuration}
              disabled={updateSecurityMutation.isPending || !hasChanges}
            >
              {t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('tenantManagement.security.overview')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {t('tenantManagement.security.overviewDesc')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
