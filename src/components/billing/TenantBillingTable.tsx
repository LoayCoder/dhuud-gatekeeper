import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, FileDown, Edit } from 'lucide-react';
import { formatSAR } from '@/lib/pricing-engine';

interface TenantBillingData {
  id: string;
  name: string;
  plans?: { name: string; display_name: string } | null;
  currentBilling?: {
    total_profiles: number;
    profile_charges: number;
    status: string;
  } | null;
  lastBilling?: {
    total_profiles: number;
    profile_charges: number;
  } | null;
}

interface TenantBillingTableProps {
  tenants: TenantBillingData[] | undefined;
  isLoading?: boolean;
  onViewDetails?: (tenantId: string) => void;
  onChangePlan?: (tenantId: string) => void;
}

export function TenantBillingTable({ 
  tenants, 
  isLoading, 
  onViewDetails,
  onChangePlan,
}: TenantBillingTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('tenantManagement.name')}</TableHead>
            <TableHead>{t('subscription.plan')}</TableHead>
            <TableHead>{t('profileBilling.thisMonth')}</TableHead>
            <TableHead>{t('profileBilling.lastMonth')}</TableHead>
            <TableHead>{t('common.status')}</TableHead>
            <TableHead>{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3].map((i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-8 w-20" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (!tenants?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('common.noData')}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('tenantManagement.name')}</TableHead>
          <TableHead>{t('subscription.plan')}</TableHead>
          <TableHead>{t('profileBilling.thisMonth')}</TableHead>
          <TableHead>{t('profileBilling.lastMonth')}</TableHead>
          <TableHead>{t('common.status')}</TableHead>
          <TableHead>{t('common.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tenants.map((tenant) => (
          <TableRow key={tenant.id}>
            <TableCell className="font-medium">{tenant.name}</TableCell>
            <TableCell>
              <Badge variant="outline">
                {tenant.plans?.display_name || tenant.plans?.name || 'Starter'}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <p className="text-sm">
                  {tenant.currentBilling?.total_profiles || 0} {t('profileBilling.profiles')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatSAR(tenant.currentBilling?.profile_charges || 0)}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <p className="text-sm">
                  {tenant.lastBilling?.total_profiles || 0} {t('profileBilling.profiles')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatSAR(tenant.lastBilling?.profile_charges || 0)}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <Badge 
                variant={tenant.currentBilling?.status === 'paid' ? 'default' : 'secondary'}
              >
                {tenant.currentBilling?.status || t('profileBilling.pending')}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {onViewDetails && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(tenant.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {onChangePlan && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChangePlan(tenant.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
