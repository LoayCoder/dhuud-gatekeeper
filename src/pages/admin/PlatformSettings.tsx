import { useState, useEffect } from 'react';
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
import { Loader2, Settings, Smartphone, Eye, Save } from 'lucide-react';
import { clearSplashCache, type SplashSettings } from '@/hooks/use-splash-settings';
import { SplashScreen } from '@/components/SplashScreen';
import { cn } from '@/lib/utils';
import type { Json } from '@/integrations/supabase/types';

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
    </div>
  );
}
