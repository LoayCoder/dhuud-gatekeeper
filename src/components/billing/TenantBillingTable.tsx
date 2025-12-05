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
import { Eye, Edit } from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/use-tenant-currency';

const RTL_LANGUAGES = ['ar', 'ur'];

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
  const { t, i18n } = useTranslation();
  const isRTL = RTL_LANGUAGES.includes(i18n.language);
  const { formatAmount } = useCurrencyFormatter();

  if (isLoading) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">{t('tenantManagement.columns.name')}</TableHead>
              <TableHead className="text-start">{t('subscription.plan')}</TableHead>
              <TableHead className="text-start">{t('profileBilling.thisMonth')}</TableHead>
              <TableHead className="text-start">{t('profileBilling.lastMonth')}</TableHead>
              <TableHead className="text-start">{t('common.status')}</TableHead>
              <TableHead className="text-start">{t('common.actions')}</TableHead>
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
      </div>
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
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-start">{t('tenantManagement.columns.name')}</TableHead>
            <TableHead className="text-start">{t('subscription.plan')}</TableHead>
            <TableHead className="text-start">{t('profileBilling.thisMonth')}</TableHead>
            <TableHead className="text-start">{t('profileBilling.lastMonth')}</TableHead>
            <TableHead className="text-start">{t('common.status')}</TableHead>
            <TableHead className="text-start">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => (
            <TableRow key={tenant.id}>
              <TableCell className="font-medium text-start">{tenant.name}</TableCell>
              <TableCell className="text-start">
                <Badge variant="outline">
                  {tenant.plans?.display_name || tenant.plans?.name || t('subscription.starter')}
                </Badge>
              </TableCell>
              <TableCell className="text-start">
                <div className="space-y-1">
                  <p className="text-sm">
                    {tenant.currentBilling?.total_profiles || 0} {t('profileBilling.profiles')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatAmount((tenant.currentBilling?.profile_charges || 0) * 100)}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-start">
                <div className="space-y-1">
                  <p className="text-sm">
                    {tenant.lastBilling?.total_profiles || 0} {t('profileBilling.profiles')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatAmount((tenant.lastBilling?.profile_charges || 0) * 100)}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-start">
                <Badge 
                  variant={tenant.currentBilling?.status === 'paid' ? 'default' : 'secondary'}
                >
                  {tenant.currentBilling?.status === 'paid' 
                    ? t('profileBilling.paid') 
                    : t('profileBilling.pending')}
                </Badge>
              </TableCell>
              <TableCell className="text-start">
                <div className="flex items-center gap-2 justify-start">
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
    </div>
  );
}
