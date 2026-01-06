import { useTranslation } from 'react-i18next';
import { AppUpdateBroadcastPanel } from '@/components/admin/AppUpdateBroadcastPanel';

export default function AppUpdates() {
  const { t } = useTranslation();

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {t('admin.updates.title', 'App Updates')}
        </h1>
        <p className="text-muted-foreground">
          {t('admin.updates.subtitle', 'Manage and broadcast app updates to all users')}
        </p>
      </div>
      
      <AppUpdateBroadcastPanel />
    </div>
  );
}
