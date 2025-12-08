import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/use-user-roles';
import { DigestPreferences } from './DigestPreferences';
import { DeletionPasswordSettings } from './DeletionPasswordSettings';
import { Separator } from '@/components/ui/separator';

interface HSSEManagerSettingsProps {
  className?: string;
}

/**
 * HSSE Manager specific settings component
 * Only renders for users with HSSE Manager or Admin roles
 */
export function HSSEManagerSettings({ className }: HSSEManagerSettingsProps) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const { hasRole } = useUserRoles();

  // Show for HSSE managers and admins
  const isHSSEManager = isAdmin || hasRole('hsse_manager');

  if (!isHSSEManager) {
    return null;
  }

  return (
    <div className={className}>
      <Separator className="my-6" />
      <DigestPreferences />
      <Separator className="my-6" />
      <DeletionPasswordSettings />
    </div>
  );
}
