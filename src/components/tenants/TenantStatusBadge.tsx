import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, PauseCircle, XCircle } from 'lucide-react';

type TenantStatus = 'active' | 'suspended' | 'disabled';

interface TenantStatusBadgeProps {
  status: TenantStatus;
}

export function TenantStatusBadge({ status }: TenantStatusBadgeProps) {
  const { t } = useTranslation();

  const config: Record<TenantStatus, { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: React.ReactNode }> = {
    active: {
      label: t('tenantManagement.status.active'),
      variant: 'default',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    suspended: {
      label: t('tenantManagement.status.suspended'),
      variant: 'secondary',
      icon: <PauseCircle className="h-3 w-3" />,
    },
    disabled: {
      label: t('tenantManagement.status.disabled'),
      variant: 'destructive',
      icon: <XCircle className="h-3 w-3" />,
    },
  };

  const { label, variant, icon } = config[status];

  return (
    <Badge variant={variant} className="gap-1">
      {icon}
      {label}
    </Badge>
  );
}
