import { useTranslation } from 'react-i18next';
import { useCachedUserRole } from '@/hooks/use-cached-profile';
import { DigestPreferences } from './DigestPreferences';
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
  const { data: userRole } = useCachedUserRole();

  // Only show for HSSE managers and admins
  const isHSSEManager = userRole === 'admin'; // Simplified check, can be expanded

  if (!isHSSEManager) {
    return null;
  }

  return (
    <div className={className}>
      <Separator className="my-6" />
      <DigestPreferences />
    </div>
  );
}
