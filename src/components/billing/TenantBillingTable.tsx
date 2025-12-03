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
import { formatSAR } from '@/lib/pricing-engine';

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

  // Define columns based on RTL direction
  const columns = isRTL ? [
    { key: 'actions', label: t('common.actions') },
    { key: 'status', label: t('common.status') },
    { key: 'lastMonth', label: t('profileBilling.lastMonth') },
    { key: 'thisMonth', label: t('profileBilling.thisMonth') },
    { key: 'plan', label: t('subscription.plan') },
    { key: 'name', label: t('tenantManagement.name') },
  ] : [
    { key: 'name', label: t('tenantManagement.name') },
    { key: 'plan', label: t('subscription.plan') },
    { key: 'thisMonth', label: t('profileBilling.thisMonth') },
    { key: 'lastMonth', label: t('profileBilling.lastMonth') },
    { key: 'status', label: t('common.status') },
    { key: 'actions', label: t('common.actions') },
  ];

  if (isLoading) {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={isRTL ? 'text-right' : 'text-left'}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!tenants?.length) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${isRTL ? 'text-right' : ''}`}>
        {t('common.noData')}
      </div>
    );
  }

  const renderCell = (tenant: TenantBillingData, columnKey: string) => {
    switch (columnKey) {
      case 'name':
        return <span className="font-medium">{tenant.name}</span>;
      case 'plan':
        return (
          <Badge variant="outline">
            {tenant.plans?.display_name || tenant.plans?.name || 'Starter'}
          </Badge>
        );
      case 'thisMonth':
        return (
          <div className="space-y-1">
            <p className="text-sm">
              {tenant.currentBilling?.total_profiles || 0} {t('profileBilling.profiles')}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatSAR(tenant.currentBilling?.profile_charges || 0)}
            </p>
          </div>
        );
      case 'lastMonth':
        return (
          <div className="space-y-1">
            <p className="text-sm">
              {tenant.lastBilling?.total_profiles || 0} {t('profileBilling.profiles')}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatSAR(tenant.lastBilling?.profile_charges || 0)}
            </p>
          </div>
        );
      case 'status':
        return (
          <Badge 
            variant={tenant.currentBilling?.status === 'paid' ? 'default' : 'secondary'}
          >
            {tenant.currentBilling?.status || t('profileBilling.pending')}
          </Badge>
        );
      case 'actions':
        return (
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
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
        );
      default:
        return null;
    }
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={isRTL ? 'text-right' : 'text-left'}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((tenant) => (
            <TableRow key={tenant.id}>
              {columns.map((col) => (
                <TableCell key={col.key} className={isRTL ? 'text-right' : 'text-left'}>
                  {renderCell(tenant, col.key)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}