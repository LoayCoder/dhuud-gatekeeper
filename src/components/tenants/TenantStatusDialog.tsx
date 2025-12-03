import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, AlertTriangle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Tenant = Tables<'tenants'>;
type TenantStatus = 'active' | 'suspended' | 'disabled';

interface TenantStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  newStatus: TenantStatus | null;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function TenantStatusDialog({
  open,
  onOpenChange,
  tenant,
  newStatus,
  onConfirm,
  isSubmitting,
}: TenantStatusDialogProps) {
  const { t } = useTranslation();

  if (!tenant || !newStatus) return null;

  const statusConfig: Record<TenantStatus, { title: string; description: string; warning?: string }> = {
    active: {
      title: t('tenantManagement.statusDialog.activateTitle'),
      description: t('tenantManagement.statusDialog.activateDescription', { name: tenant.name }),
    },
    suspended: {
      title: t('tenantManagement.statusDialog.suspendTitle'),
      description: t('tenantManagement.statusDialog.suspendDescription', { name: tenant.name }),
      warning: t('tenantManagement.statusDialog.suspendWarning'),
    },
    disabled: {
      title: t('tenantManagement.statusDialog.disableTitle'),
      description: t('tenantManagement.statusDialog.disableDescription', { name: tenant.name }),
      warning: t('tenantManagement.statusDialog.disableWarning'),
    },
  };

  const config = statusConfig[newStatus];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription>{config.description}</AlertDialogDescription>
        </AlertDialogHeader>

        {config.warning && (
          <div className="flex items-start gap-3 p-3 rounded-md bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm">{config.warning}</p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isSubmitting}
            className={newStatus === 'disabled' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {t('common.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
