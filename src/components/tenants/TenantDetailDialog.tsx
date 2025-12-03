import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvitationManagement } from './InvitationManagement';
import type { Tables } from '@/integrations/supabase/types';

type Tenant = Tables<'tenants'>;

interface TenantDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
}

export function TenantDetailDialog({ open, onOpenChange, tenant }: TenantDetailDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('invitations');

  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{tenant.name}</DialogTitle>
          <DialogDescription>{t('tenantManagement.detail.description')}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="invitations">{t('tenantManagement.detail.invitations')}</TabsTrigger>
          </TabsList>
          <TabsContent value="invitations" className="flex-1 overflow-auto mt-4">
            <InvitationManagement tenant={tenant} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
