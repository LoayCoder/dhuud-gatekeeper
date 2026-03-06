import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tenantPublicFeaturesSchema, TenantPublicFeaturesValues } from './TenantPublicFeaturesSchema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Globe, Copy, Check, Link } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

interface TenantPublicFeaturesControlProps {
  tenant: Tables<'tenants'>;
}

export function TenantPublicFeaturesControl({ tenant }: TenantPublicFeaturesControlProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // UI-only state (not form fields)
  const [isEnabled, setIsEnabled] = useState(tenant.allow_public_gate_pass_requests ?? false);
  const [copied, setCopied] = useState(false);

  const form = useForm<TenantPublicFeaturesValues>({
    resolver: zodResolver(tenantPublicFeaturesSchema),
    defaultValues: {
      customDomain: tenant.public_gate_pass_domain ?? '',
      instructionsEn: tenant.public_gate_pass_instructions ?? '',
      instructionsAr: tenant.public_gate_pass_instructions_ar ?? '',
    },
  });

  // Sync with parent when tenant prop changes
  useEffect(() => {
    setIsEnabled(tenant.allow_public_gate_pass_requests ?? false);
    form.reset({
      customDomain: tenant.public_gate_pass_domain ?? '',
      instructionsEn: tenant.public_gate_pass_instructions ?? '',
      instructionsAr: tenant.public_gate_pass_instructions_ar ?? '',
    });
  }, [tenant.id, tenant.allow_public_gate_pass_requests, tenant.public_gate_pass_domain, tenant.public_gate_pass_instructions, tenant.public_gate_pass_instructions_ar, form]);

  // Generate public URL with custom domain support
  const customDomain = form.watch('customDomain');
  const instructionsEn = form.watch('instructionsEn');
  const instructionsAr = form.watch('instructionsAr');

  const getPublicUrl = () => {
    const baseUrl = customDomain?.trim() || window.location.origin;
    const cleanBase = baseUrl.replace(/\/$/, '');
    return `${cleanBase}/${tenant.slug}/request`;
  };

  const publicUrl = getPublicUrl();
  
  const hasInstructionChanges = 
    instructionsEn !== (tenant.public_gate_pass_instructions ?? '') ||
    instructionsAr !== (tenant.public_gate_pass_instructions_ar ?? '');

  const hasDomainChanges = customDomain !== (tenant.public_gate_pass_domain ?? '');

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
    onError: (error, variables) => {
      setIsEnabled(!variables);
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const domainMutation = useMutation({
    mutationFn: async () => {
      const domain = form.getValues('customDomain');
      const { error } = await supabase
        .from('tenants')
        .update({ public_gate_pass_domain: domain?.trim() || null })
        .eq('id', tenant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast({
        title: t('tenantManagement.publicFeatures.gatePass.domainSaved'),
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
      const data = form.getValues();
      const { error } = await supabase
        .from('tenants')
        .update({
          public_gate_pass_instructions: data.instructionsEn || null,
          public_gate_pass_instructions_ar: data.instructionsAr || null,
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

  const handleToggle = (checked: boolean) => {
    setIsEnabled(checked);
    toggleMutation.mutate(checked);
  };

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
          {/* Custom Domain */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              {t('tenantManagement.publicFeatures.gatePass.customDomain')}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                {...form.register('customDomain')}
                placeholder={t('tenantManagement.publicFeatures.gatePass.customDomainPlaceholder')}
                className="flex-1"
                dir="ltr"
              />
              <Button
                variant="outline"
                onClick={() => domainMutation.mutate()}
                disabled={domainMutation.isPending || !hasDomainChanges}
              >
                {t('common.save')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('tenantManagement.publicFeatures.gatePass.customDomainDesc')}
            </p>
          </div>

          {/* Public URL */}
          <div className="space-y-2">
            <Label>{t('tenantManagement.publicFeatures.gatePass.publicUrl')}</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono truncate" dir="ltr">
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
              onCheckedChange={handleToggle}
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
              {...form.register('instructionsEn')}
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
              {...form.register('instructionsAr')}
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
