import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

export interface SplashSettings {
  enabled: boolean;
  duration_ms: number;
  message_ar: string;
  message_en: string;
  subtitle_ar: string;
  subtitle_en: string;
}

const MIN_DURATION_MS = 3000; // Minimum 3 seconds

const DEFAULT_SETTINGS: SplashSettings = {
  enabled: true,
  duration_ms: 3500,
  message_ar: 'مرحباً بك في منصة الصحة والسلامة',
  message_en: 'Welcome to HSSE Platform',
  subtitle_ar: 'نحو بيئة عمل آمنة',
  subtitle_en: 'Towards a Safe Work Environment',
};

const CACHE_KEY = 'splash_screen_settings';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedSettings {
  settings: SplashSettings;
  timestamp: number;
}

export function useSplashSettings() {
  const { i18n } = useTranslation();
  const [settings, setSettings] = useState<SplashSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Check cache first
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { settings: cachedSettings, timestamp }: CachedSettings = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setSettings(cachedSettings);
            setIsLoading(false);
            return;
          }
        }

        // Fetch from database
        const { data, error } = await supabase
          .from('platform_settings')
          .select('value')
          .eq('setting_key', 'splash_screen')
          .single();

        if (error || !data) {
          // Use cached or default
          setSettings(cached ? JSON.parse(cached).settings : DEFAULT_SETTINGS);
        } else {
          const fetchedSettings = data.value as unknown as SplashSettings;
          setSettings(fetchedSettings);
          
          // Cache the settings
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            settings: fetchedSettings,
            timestamp: Date.now(),
          }));
        }
      } catch (error) {
        console.error('Error fetching splash settings:', error);
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const isArabic = i18n.language === 'ar';
  
  const rawDuration = settings?.duration_ms ?? DEFAULT_SETTINGS.duration_ms;
  const duration = Math.max(rawDuration, MIN_DURATION_MS); // Enforce minimum 3 seconds
  
  return {
    settings,
    isLoading,
    message: settings ? (isArabic ? settings.message_ar : settings.message_en) : '',
    subtitle: settings ? (isArabic ? settings.subtitle_ar : settings.subtitle_en) : '',
    duration,
    enabled: settings?.enabled ?? DEFAULT_SETTINGS.enabled,
  };
}

export function clearSplashCache() {
  localStorage.removeItem(CACHE_KEY);
}
