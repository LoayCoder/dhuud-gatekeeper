import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Globe, Copy, Check } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

interface TenantPublicFeaturesControlProps {
  tenant: Tables<'tenants'>;
}

export function TenantPublicFeaturesControl({ tenant }: TenantPublicFeaturesControlProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [instructionsEn, setInstructionsEn] = useState(tenant.public_gate_pass_instructions ?? '');
  const [instructionsAr, setInstructionsAr] = useState(tenant.public_gate_pass_instructions_ar ?? '');
  const [copied, setCopied] = useState(false);

  const publicUrl = `${window.location.origin}/${tenant.slug}/request`;
  
  const isEnabled = tenant.allow_public_gate_pass_requests ?? false;
  const hasInstructionChanges = 
    instructionsEn !== (tenant.public_gate_pass_instructions ?? '') ||
    instructionsAr !== (tenant.public_gate_pass_instructions_ar ?? '');

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from('tenants')
        .update({ allow_public_gate_pass_requests: enabled })
        .eq('id', tenant.id);
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: t('tenantManagement.publicFeatures.gatePass.toggleUpdated'),
        description: enabled
          ? t('tenantManagement.publicFeatures.gatePass.toggleEnabled')
          : t('tenantManagement.publicFeatures.gatePass.toggleDisabled'),
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

  const instructionsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tenants')
        .update({
          public_gate_pass_instructions: instructionsEn || null,
          public_gate_pass_instructions_ar: instructionsAr || null,
        })
        .eq('id', tenant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: t('tenantManagement.publicFeatures.gatePass.updated'),
        description: t('tenantManagement.publicFeatures.gatePass.updatedDesc'),
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

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast({
        title: t('tenantManagement.publicFeatures.gatePass.urlCopied'),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: t('common.error'),
        description: 'Failed to copy URL',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Public Gate Pass Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                {t('tenantManagement.publicFeatures.gatePass.title')}
              </CardTitle>
            </div>
            <Badge variant={isEnabled ? 'default' : 'secondary'}>
              {isEnabled
                ? t('tenantManagement.publicFeatures.gatePass.enabled')
                : t('tenantManagement.publicFeatures.gatePass.disabled')}
            </Badge>
          </div>
          <CardDescription>
            {t('tenantManagement.publicFeatures.gatePass.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Public URL */}
          <div className="space-y-2">
            <Label>{t('tenantManagement.publicFeatures.gatePass.publicUrl')}</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono truncate">
                {publicUrl}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyUrl}
                disabled={!isEnabled}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="public-gate-pass-toggle" className="text-base font-medium">
                {t('tenantManagement.publicFeatures.gatePass.title')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('tenantManagement.publicFeatures.gatePass.description')}
              </p>
            </div>
            <Switch
              id="public-gate-pass-toggle"
              checked={isEnabled}
              onCheckedChange={(checked) => toggleMutation.mutate(checked)}
              disabled={toggleMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('tenantManagement.publicFeatures.gatePass.instructions')}
          </CardTitle>
          <CardDescription>
            {t('tenantManagement.publicFeatures.gatePass.instructionsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* English Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions-en">
              {t('tenantManagement.publicFeatures.gatePass.instructionsEn')}
            </Label>
            <Textarea
              id="instructions-en"
              value={instructionsEn}
              onChange={(e) => setInstructionsEn(e.target.value)}
              placeholder={t('tenantManagement.publicFeatures.gatePass.placeholderEn')}
              rows={3}
              dir="ltr"
            />
          </div>

          {/* Arabic Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions-ar">
              {t('tenantManagement.publicFeatures.gatePass.instructionsAr')}
            </Label>
            <Textarea
              id="instructions-ar"
              value={instructionsAr}
              onChange={(e) => setInstructionsAr(e.target.value)}
              placeholder={t('tenantManagement.publicFeatures.gatePass.placeholderAr')}
              rows={3}
              dir="rtl"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => instructionsMutation.mutate()}
              disabled={instructionsMutation.isPending || !hasInstructionChanges}
            >
              {t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
