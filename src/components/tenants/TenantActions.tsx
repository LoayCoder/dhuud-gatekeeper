import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Play, Pause, Ban, Settings } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Tenant = Tables<'tenants'>;
type TenantStatus = 'active' | 'suspended' | 'disabled';

interface TenantActionsProps {
  tenant: Tenant;
  onEdit: (tenant: Tenant) => void;
  onStatusChange: (tenant: Tenant, newStatus: TenantStatus) => void;
  onManageInvitations: (tenant: Tenant) => void;
}

export function TenantActions({ tenant, onEdit, onStatusChange, onManageInvitations }: TenantActionsProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">{t('tenantManagement.actions.openMenu')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(tenant)}>
          <Pencil className="h-4 w-4 me-2" />
          {t('common.edit')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onManageInvitations(tenant)}>
          <Settings className="h-4 w-4 me-2" />
          {t('tenantManagement.actions.manageTenant')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {tenant.status !== 'active' && (
          <DropdownMenuItem onClick={() => onStatusChange(tenant, 'active')}>
            <Play className="h-4 w-4 me-2" />
            {t('tenantManagement.actions.activate')}
          </DropdownMenuItem>
        )}
        {tenant.status !== 'suspended' && (
          <DropdownMenuItem onClick={() => onStatusChange(tenant, 'suspended')}>
            <Pause className="h-4 w-4 me-2" />
            {t('tenantManagement.actions.suspend')}
          </DropdownMenuItem>
        )}
        {tenant.status !== 'disabled' && (
          <DropdownMenuItem 
            onClick={() => onStatusChange(tenant, 'disabled')}
            className="text-destructive focus:text-destructive"
          >
            <Ban className="h-4 w-4 me-2" />
            {t('tenantManagement.actions.disable')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
