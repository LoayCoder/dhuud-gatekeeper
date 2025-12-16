import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Check, Share, Plus } from 'lucide-react';
import { usePWAInstall } from '@/hooks/use-pwa-install';

export function InstallAppCard() {
  const { t } = useTranslation();
  const { canInstall, isIOS, promptInstall, dismissUntil } = usePWAInstall();

  if (!canInstall) {
    return null;
  }

  const benefits = [
    t('pwa.benefitOffline'),
    t('pwa.benefitFaster'),
    t('pwa.benefitNotifications'),
    t('pwa.benefitHomeScreen'),
  ];

  if (isIOS) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{t('pwa.iosTitle')}</CardTitle>
          </div>
          <CardDescription>{t('pwa.dashboardSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              1
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>{t('pwa.iosStep1')}</span>
              <Share className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              2
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>{t('pwa.iosStep2')}</span>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => dismissUntil(7)}
          >
            {t('pwa.maybeLater')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">{t('pwa.dashboardTitle')}</CardTitle>
        </div>
        <CardDescription>{t('pwa.dashboardSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {benefits.map((benefit, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-600" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
        <div className="space-y-2">
          <Button className="w-full touch-target" onClick={promptInstall}>
            {t('pwa.installNow')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => dismissUntil(7)}
          >
            {t('pwa.maybeLater')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
