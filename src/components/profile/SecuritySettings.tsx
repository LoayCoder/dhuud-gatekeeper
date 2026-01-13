import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Smartphone, Bell, Settings2 } from "lucide-react";
import { SecuritySection } from "./SecuritySection";
import { TwoFactorCompact } from "./TwoFactorCompact";
import { PasswordChangeSection } from "./PasswordChangeSection";
import { TrustedDevicesCompact } from "./TrustedDevicesCompact";
import { BiometricCompact } from "./BiometricCompact";
import { NotificationPreferences } from "./NotificationPreferences";
import { HSSEManagerSettings } from "./HSSEManagerSettings";

export function SecuritySettings() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [deviceCount, setDeviceCount] = useState(0);

  return (
    <div className="space-y-3" dir={direction}>
      {/* Authentication & Access Section */}
      <SecuritySection
        title={t('securitySettings.authenticationAccess', 'Authentication & Access')}
        description={t('securitySettings.authDescription', 'Manage your login security')}
        icon={ShieldCheck}
        status={mfaEnabled ? "enabled" : "disabled"}
        statusLabel={mfaEnabled ? t('common.protected') : t('common.basic')}
        defaultExpanded={true}
      >
        <TwoFactorCompact onStatusChange={setMfaEnabled} />
        <PasswordChangeSection />
      </SecuritySection>

      {/* Devices & Login Methods Section */}
      <SecuritySection
        title={t('securitySettings.devicesLoginMethods', 'Devices & Login Methods')}
        description={t('securitySettings.devicesDescription', 'Manage trusted devices and passkeys')}
        icon={Smartphone}
        statusCount={deviceCount}
        defaultExpanded={true}
      >
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 text-start">
              {t('trustedDevices.title')}
            </h4>
            <TrustedDevicesCompact onDeviceCountChange={setDeviceCount} />
          </div>
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2 text-start">
              {t('biometric.title')}
            </h4>
            <BiometricCompact />
          </div>
        </div>
      </SecuritySection>

      {/* Notifications Section - Collapsed by default */}
      <SecuritySection
        title={t('notifications.title')}
        description={t('notifications.description')}
        icon={Bell}
        defaultExpanded={false}
      >
        <NotificationPreferences />
      </SecuritySection>

      {/* HSSE Manager Settings - Advanced section (only for managers/admins) */}
      <HSSEManagerSettings />
    </div>
  );
}
