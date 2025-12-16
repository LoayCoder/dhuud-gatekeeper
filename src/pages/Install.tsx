import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Smartphone, 
  Download, 
  Wifi, 
  Bell, 
  Zap, 
  Home,
  Share,
  Plus,
  MoreVertical,
  Monitor,
  CheckCircle2,
  Copy,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { cn } from '@/lib/utils';

export default function Install() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isInstalled, isIOS, canInstall, promptInstall } = usePWAInstall();
  
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      toast({
        title: t('install.linkCopied', 'Link copied!'),
        description: t('install.linkCopiedDesc', 'Share this link with others'),
      });
    } catch {
      toast({
        title: t('common.error', 'Error'),
        description: t('install.copyFailed', 'Failed to copy link'),
        variant: 'destructive',
      });
    }
  };

  const benefits = [
    { icon: Wifi, label: t('install.benefit1', 'Works offline') },
    { icon: Bell, label: t('install.benefit2', 'Push notifications') },
    { icon: Zap, label: t('install.benefit3', 'Faster loading') },
    { icon: Home, label: t('install.benefit4', 'Home screen access') },
  ];

  // Detect platform for auto-highlighting tab
  const detectPlatform = (): 'android' | 'ios' | 'desktop' => {
    if (typeof navigator === 'undefined') return 'desktop';
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'desktop';
  };

  const defaultTab = detectPlatform();

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>{t('install.alreadyInstalled', "You're All Set!")}</CardTitle>
            <CardDescription>
              {t('install.alreadyInstalledText', 'This app is already installed on your device.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              {t('install.goToDashboard', 'Go to Dashboard')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="mx-auto mb-6 h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {t('install.heroTitle', 'Take Dhuud HSSE Everywhere')}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t('install.heroSubtitle', 'Install the app for offline access, push notifications, and faster loading')}
          </p>

          {/* Quick Install Button for supported browsers */}
          {canInstall && !isIOS && (
            <Button size="lg" className="mt-6 gap-2" onClick={promptInstall}>
              <Download className="h-5 w-5" />
              {t('install.installNow', 'Install Now')}
            </Button>
          )}
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12">
          {benefits.map((benefit, index) => (
            <Card key={index} className="text-center p-4">
              <benefit.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">{benefit.label}</p>
            </Card>
          ))}
        </div>

        {/* Platform-Specific Guides */}
        <Card className="max-w-3xl mx-auto mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              {t('install.platformGuide', 'Installation Guide')}
            </CardTitle>
            <CardDescription>
              {t('install.platformGuideDesc', 'Follow the steps for your device')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="android" className="gap-2">
                  <Smartphone className="h-4 w-4" />
                  {t('install.androidTab', 'Android')}
                </TabsTrigger>
                <TabsTrigger value="ios" className="gap-2">
                  <Smartphone className="h-4 w-4" />
                  {t('install.iosTab', 'iPhone/iPad')}
                </TabsTrigger>
                <TabsTrigger value="desktop" className="gap-2">
                  <Monitor className="h-4 w-4" />
                  {t('install.desktopTab', 'Desktop')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="android" className="space-y-4">
                <InstallStep 
                  number={1}
                  icon={<MoreVertical className="h-5 w-5" />}
                  title={t('install.androidStep1', 'Tap the menu icon (⋮) in Chrome')}
                  description={t('install.androidStep1Desc', 'Located in the top-right corner of your browser')}
                />
                <InstallStep 
                  number={2}
                  icon={<Download className="h-5 w-5" />}
                  title={t('install.androidStep2', "Select 'Install app' or 'Add to Home screen'")}
                  description={t('install.androidStep2Desc', 'You may need to scroll down in the menu')}
                />
                <InstallStep 
                  number={3}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  title={t('install.androidStep3', "Tap 'Install' to confirm")}
                  description={t('install.androidStep3Desc', 'The app will be added to your home screen')}
                />
              </TabsContent>

              <TabsContent value="ios" className="space-y-4">
                <InstallStep 
                  number={1}
                  icon={<Share className="h-5 w-5" />}
                  title={t('install.iosStep1', 'Tap the Share button')}
                  description={t('install.iosStep1Desc', 'The square icon with an arrow at the bottom of Safari')}
                />
                <InstallStep 
                  number={2}
                  icon={<Plus className="h-5 w-5" />}
                  title={t('install.iosStep2', "Scroll down and tap 'Add to Home Screen'")}
                  description={t('install.iosStep2Desc', 'You may need to scroll right in the action row')}
                />
                <InstallStep 
                  number={3}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  title={t('install.iosStep3', "Tap 'Add' in the top right corner")}
                  description={t('install.iosStep3Desc', 'The app icon will appear on your home screen')}
                />
              </TabsContent>

              <TabsContent value="desktop" className="space-y-4">
                <InstallStep 
                  number={1}
                  icon={<Download className="h-5 w-5" />}
                  title={t('install.desktopStep1', 'Look for the install icon in the address bar')}
                  description={t('install.desktopStep1Desc', 'A small icon will appear on the right side (Chrome/Edge)')}
                />
                <InstallStep 
                  number={2}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  title={t('install.desktopStep2', "Click 'Install' in the popup")}
                  description={t('install.desktopStep2Desc', 'The app will open in its own window')}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* QR Code & Share Section */}
        <Card className="max-w-3xl mx-auto mb-12">
          <CardHeader>
            <CardTitle>{t('install.shareTitle', 'Share This App')}</CardTitle>
            <CardDescription>
              {t('install.shareDescription', 'Scan the QR code or copy the link to share')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG 
                  value={currentUrl} 
                  size={160}
                  level="M"
                  includeMargin
                />
              </div>
              <div className="flex-1 space-y-4 w-full md:w-auto">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <code className="flex-1 text-sm truncate">{currentUrl}</code>
                  <Button variant="ghost" size="icon" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button className="w-full gap-2" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                  {t('install.copyLink', 'Copy Link')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              {t('install.troubleshootingTitle', 'Troubleshooting')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  {t('install.troubleshoot1Title', 'Install button not showing?')}
                </AccordionTrigger>
                <AccordionContent>
                  {t('install.troubleshoot1Text', 'Try using Chrome, Edge, or Safari. Clear your browser cache and reload the page. Make sure you\'re not in private/incognito mode.')}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>
                  {t('install.troubleshoot2Title', 'App not updating?')}
                </AccordionTrigger>
                <AccordionContent>
                  {t('install.troubleshoot2Text', 'Close and reopen the app completely. On mobile, swipe the app away from recent apps and reopen it. You may also check for updates in your browser settings.')}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>
                  {t('install.troubleshoot3Title', 'Offline features not working?')}
                </AccordionTrigger>
                <AccordionContent>
                  {t('install.troubleshoot3Text', 'Ensure you visited the main pages while online to cache the data. Some features require an initial online session to download necessary files.')}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InstallStep({ 
  number, 
  icon, 
  title, 
  description 
}: { 
  number: number; 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
        {number}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-muted-foreground">{icon}</span>
          <h3 className="font-medium">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
