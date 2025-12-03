import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { TenantStatusBadge } from './TenantStatusBadge';
import { TenantActions } from './TenantActions';
import type { Tables } from '@/integrations/supabase/types';

type Tenant = Tables<'tenants'>;
type TenantStatus = 'active' | 'suspended' | 'disabled';

interface TenantListTableProps {
  tenants: Tenant[];
  isLoading: boolean;
  onEdit: (tenant: Tenant) => void;
  onStatusChange: (tenant: Tenant, newStatus: TenantStatus) => void;
}

export function TenantListTable({ tenants, isLoading, onEdit, onStatusChange }: TenantListTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('tenantManagement.noTenants')}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('tenantManagement.columns.name')}</TableHead>
            <TableHead>{t('tenantManagement.columns.slug')}</TableHead>
            <TableHead>{t('tenantManagement.columns.industry')}</TableHead>
            <TableHead>{t('tenantManagement.columns.location')}</TableHead>
            <TableHead>{t('tenantManagement.columns.contact')}</TableHead>
            <TableHead>{t('common.status')}</TableHead>
            <TableHead className="text-end">{t('orgStructure.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => (
            <TableRow key={tenant.id}>
              <TableCell className="font-medium">{tenant.name}</TableCell>
              <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
              <TableCell>{tenant.industry || '—'}</TableCell>
              <TableCell>
                {tenant.city && tenant.country 
                  ? `${tenant.city}, ${tenant.country}`
                  : tenant.country || tenant.city || '—'}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {tenant.contact_person && <div>{tenant.contact_person}</div>}
                  {tenant.contact_email && (
                    <div className="text-muted-foreground">{tenant.contact_email}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <TenantStatusBadge status={tenant.status} />
              </TableCell>
              <TableCell className="text-end">
                <TenantActions
                  tenant={tenant}
                  onEdit={onEdit}
                  onStatusChange={onStatusChange}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
