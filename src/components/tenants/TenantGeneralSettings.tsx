import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Tenant = Tables<'tenants'>;

interface TenantGeneralSettingsProps {
  tenant: Tenant;
}

export function TenantGeneralSettings({ tenant }: TenantGeneralSettingsProps) {
  const { t } = useTranslation();
  const [shortName, setShortName] = useState(tenant.short_name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!shortName.trim()) {
      toast.error('Short name is required');
      return;
    }
    if (shortName.length > 10) {
      toast.error('Short name must be 10 characters or less');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('tenants')
      .update({ short_name: shortName.trim().toUpperCase() })
      .eq('id', tenant.id);

    setSaving(false);
    if (error) {
      if (error.message.includes('uq_tenants_short_name')) {
        toast.error('This short name is already in use by another tenant');
      } else {
        toast.error('Failed to save: ' + error.message);
      }
    } else {
      toast.success('Short name saved successfully');
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="short_name">
          {t('tenantManagement.detail.shortName', 'Short Name (Gate Pass Prefix)')}
        </Label>
        <p className="text-sm text-muted-foreground">
          {t('tenantManagement.detail.shortNameDescription', 'Used as prefix for gate pass reference numbers (e.g., GS-2026-00001)')}
        </p>
        <div className="flex gap-2 items-center max-w-sm">
          <Input
            id="short_name"
            value={shortName}
            onChange={(e) => setShortName(e.target.value.toUpperCase())}
            placeholder="GS"
            maxLength={10}
            className="uppercase"
          />
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
