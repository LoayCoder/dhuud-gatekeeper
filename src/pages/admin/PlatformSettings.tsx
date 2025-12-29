import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Settings, Smartphone, Eye, Save, Database, Trash2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { clearSplashCache, type SplashSettings } from '@/hooks/use-splash-settings';
import { SplashScreen } from '@/components/SplashScreen';
import { cn } from '@/lib/utils';
import type { Json } from '@/integrations/supabase/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const DEFAULT_SETTINGS: SplashSettings = {
  enabled: true,
  duration_ms: 3000,
  message_ar: 'مرحباً بك في منصة الصحة والسلامة',
  message_en: 'Welcome to HSSE Platform',
  subtitle_ar: 'نحو بيئة عمل آمنة',
  subtitle_en: 'Towards a Safe Work Environment',
};

export default function PlatformSettings() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [settings, setSettings] = useState<SplashSettings>(DEFAULT_SETTINGS);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [seedResults, setSeedResults] = useState<any>(null);
  const [cleanResults, setCleanResults] = useState<any>(null);
  const [seedProgress, setSeedProgress] = useState(0);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('setting_key', 'splash_screen')
        .single();

      if (error) throw error;
      
      if (data?.value) {
        setSettings(data.value as unknown as SplashSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({ value: JSON.parse(JSON.stringify(settings)) as Json })
        .eq('setting_key', 'splash_screen');

      if (error) throw error;

      // Clear cache so changes take effect immediately
      clearSplashCache();
      
      toast.success(t('platformSettings.saved', 'Settings saved successfully'));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = () => {
    // Temporarily update cache for preview
    localStorage.setItem('splash_screen_settings', JSON.stringify({
      settings,
      timestamp: Date.now(),
    }));
    setShowPreview(true);
  };

  const handleSeedTestData = async () => {
    setIsSeeding(true);
    setSeedResults(null);
    setSeedProgress(0);
    setShowSeedModal(true);
    
    // Simulate progress since we can't get real progress from edge function
    progressIntervalRef.current = setInterval(() => {
      setSeedProgress(prev => {
        if (prev >= 90) return prev; // Cap at 90% until complete
        return prev + Math.random() * 8;
      });
    }, 1500);
    
    try {
      const { data, error } = await supabase.functions.invoke('seed-comprehensive-test-data');
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setSeedProgress(100);
      
      if (error) throw error;
      
      setSeedResults(data);
      
      if (data?.success) {
        toast.success(t('platformSettings.seedSuccess', 'Test data seeded successfully'), {
          duration: 5000,
        });
      } else {
        toast.warning(t('platformSettings.seedPartial', 'Seeding completed with some issues'), {
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error seeding test data:', error);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setSeedProgress(0);
      toast.error(t('platformSettings.seedError', 'Failed to seed test data'));
      setShowSeedModal(false);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCleanupTestData = async () => {
    setIsCleaning(true);
    setCleanResults(null);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-test-data');
      
      if (error) throw error;
      
      setCleanResults(data);
      toast.success(t('platformSettings.cleanupSuccess', 'Test data cleaned up successfully'));
    } catch (error) {
      console.error('Error cleaning up test data:', error);
      toast.error(t('platformSettings.cleanupError', 'Failed to cleanup test data'));
    } finally {
      setIsCleaning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Preview Modal */}
      {showPreview && (
        <SplashScreen onComplete={() => setShowPreview(false)} />
      )}

      {/* Seed Progress Modal */}
      <Dialog open={showSeedModal} onOpenChange={(open) => !isSeeding && setShowSeedModal(open)}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => isSeeding && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isSeeding ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : seedResults?.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              {isSeeding 
                ? t('platformSettings.seedingInProgress', 'Seeding in Progress...')
                : t('platformSettings.seedComplete', 'Seeding Complete')
              }
            </DialogTitle>
            <DialogDescription>
              {isSeeding 
                ? t('platformSettings.seedingDescription', 'Creating test data across all modules. This may take up to 2 minutes.')
                : t('platformSettings.seedCompleteDescription', 'Test data has been created successfully.')
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {isSeeding && (
              <div className="space-y-2">
                <Progress value={seedProgress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {Math.round(seedProgress)}% {t('common.complete', 'complete')}
                </p>
              </div>
            )}
            
            {seedResults && (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {seedResults.results && Object.entries(seedResults.results).map(([category, data]: [string, any]) => (
                    <div key={category} className="flex justify-between p-2 bg-muted/50 rounded">
                      <span className="font-medium capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-muted-foreground">
                        {typeof data === 'object' 
                          ? Object.values(data).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0)
                          : data
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {!isSeeding && (
            <div className="flex justify-end">
              <Button onClick={() => setShowSeedModal(false)}>
                {t('common.close', 'Close')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {t('platformSettings.title', 'Platform Settings')}
          </h1>
          <p className="text-muted-foreground">
            {t('platformSettings.description', 'Configure global platform settings')}
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin me-2" />
          ) : (
            <Save className="h-4 w-4 me-2" />
          )}
          {t('common.save')}
        </Button>
      </div>

      {/* Splash Screen Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                {t('platformSettings.splashScreen', 'Splash Screen')}
              </CardTitle>
              <CardDescription>
                {t('platformSettings.splashDescription', 'Configure the intro screen shown when users open the app')}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handlePreview}>
              <Eye className="h-4 w-4 me-2" />
              {t('platformSettings.preview', 'Preview')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">{t('platformSettings.enableSplash', 'Enable Splash Screen')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('platformSettings.enableSplashDescription', 'Show intro screen when app launches')}
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => setSettings({ ...settings, enabled })}
            />
          </div>

          <Separator />

          {/* Duration Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('platformSettings.duration', 'Duration')}</Label>
              <span className="text-sm text-muted-foreground">
                {(settings.duration_ms / 1000).toFixed(1)}s
              </span>
            </div>
            <Slider
              value={[settings.duration_ms]}
              onValueChange={([value]) => setSettings({ ...settings, duration_ms: value })}
              min={2000}
              max={6000}
              step={500}
              disabled={!settings.enabled}
              className={cn(!settings.enabled && "opacity-50")}
            />
            <p className="text-xs text-muted-foreground">
              {t('platformSettings.durationHint', 'How long the splash screen is shown (2-6 seconds)')}
            </p>
          </div>

          <Separator />

          {/* Arabic Messages */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              🇸🇦 {t('platformSettings.arabicMessages', 'Arabic Messages')}
            </h4>
            <div className="grid gap-4 ps-4">
              <div className="space-y-2">
                <Label htmlFor="message_ar">{t('platformSettings.mainMessage', 'Main Message')}</Label>
                <Input
                  id="message_ar"
                  value={settings.message_ar}
                  onChange={(e) => setSettings({ ...settings, message_ar: e.target.value })}
                  placeholder="مرحباً بك..."
                  dir="rtl"
                  disabled={!settings.enabled}
                  className={cn(!settings.enabled && "opacity-50")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle_ar">{t('platformSettings.subtitle', 'Subtitle')}</Label>
                <Input
                  id="subtitle_ar"
                  value={settings.subtitle_ar}
                  onChange={(e) => setSettings({ ...settings, subtitle_ar: e.target.value })}
                  placeholder="نحو بيئة..."
                  dir="rtl"
                  disabled={!settings.enabled}
                  className={cn(!settings.enabled && "opacity-50")}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* English Messages */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              🇬🇧 {t('platformSettings.englishMessages', 'English Messages')}
            </h4>
            <div className="grid gap-4 ps-4">
              <div className="space-y-2">
                <Label htmlFor="message_en">{t('platformSettings.mainMessage', 'Main Message')}</Label>
                <Input
                  id="message_en"
                  value={settings.message_en}
                  onChange={(e) => setSettings({ ...settings, message_en: e.target.value })}
                  placeholder="Welcome to..."
                  dir="ltr"
                  disabled={!settings.enabled}
                  className={cn(!settings.enabled && "opacity-50")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subtitle_en">{t('platformSettings.subtitle', 'Subtitle')}</Label>
                <Input
                  id="subtitle_en"
                  value={settings.subtitle_en}
                  onChange={(e) => setSettings({ ...settings, subtitle_en: e.target.value })}
                  placeholder="Towards a..."
                  dir="ltr"
                  disabled={!settings.enabled}
                  className={cn(!settings.enabled && "opacity-50")}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Developer Tools */}
      <Card className="border-amber-500/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle>{t('platformSettings.developerTools', 'Developer Tools')}</CardTitle>
          </div>
          <CardDescription>
            {t('platformSettings.developerToolsDescription', 'Tools for development and QA testing. Use with caution in production.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seed Test Data */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <span className="font-medium">{t('platformSettings.seedTestData', 'Seed Test Data')}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('platformSettings.seedTestDataDescription', 'Populate the database with realistic test data for all modules (prefixed with TEST-)')}
              </p>
            </div>
            <Button 
              onClick={handleSeedTestData} 
              disabled={isSeeding}
              variant="outline"
            >
              {isSeeding ? (
                <Loader2 className="h-4 w-4 animate-spin me-2" />
              ) : (
                <Database className="h-4 w-4 me-2" />
              )}
              {isSeeding ? t('common.loading') : t('platformSettings.seedButton', 'Seed Data')}
            </Button>
          </div>

          {/* Seed Results */}
          {seedResults && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">{t('platformSettings.seedResults', 'Seed Results')}</h4>
              <pre className="text-xs overflow-auto max-h-48">
                {JSON.stringify(seedResults.results, null, 2)}
              </pre>
            </div>
          )}

          <Separator />

          {/* Cleanup Test Data */}
          <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="font-medium">{t('platformSettings.cleanupTestData', 'Cleanup Test Data')}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('platformSettings.cleanupTestDataDescription', 'Remove all test data (records prefixed with TEST-) from the database')}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive"
                  disabled={isCleaning}
                >
                  {isCleaning ? (
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 me-2" />
                  )}
                  {isCleaning ? t('common.loading') : t('platformSettings.cleanupButton', 'Cleanup')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('platformSettings.cleanupConfirmTitle', 'Are you sure?')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('platformSettings.cleanupConfirmDescription', 'This will permanently delete all test data (records with TEST- prefix) from your database. This action cannot be undone.')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCleanupTestData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {t('platformSettings.confirmCleanup', 'Yes, delete test data')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Cleanup Results */}
          {cleanResults && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">{t('platformSettings.cleanupResults', 'Cleanup Results')}</h4>
              <p className="text-sm text-muted-foreground mb-2">
                {t('platformSettings.totalDeleted', 'Total deleted')}: {cleanResults.total_deleted}
              </p>
              <pre className="text-xs overflow-auto max-h-48">
                {JSON.stringify(cleanResults.results, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
