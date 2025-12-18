import { useState, useEffect } from 'react';
import { useSplashSettings } from '@/hooks/use-splash-settings';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const { i18n } = useTranslation();
  const { activeLogoUrl, tenantName } = useTheme();
  const { message, subtitle, duration, enabled, isLoading } = useSplashSettings();
  
  const [phase, setPhase] = useState<'logo' | 'message' | 'subtitle' | 'fadeout' | 'done'>('logo');
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    // If disabled or still loading, skip splash
    if (!isLoading && !enabled) {
      onComplete();
      return;
    }

    if (isLoading) return;

    // Animation sequence
    const timers: NodeJS.Timeout[] = [];

    // Phase 1: Logo visible (0ms)
    timers.push(setTimeout(() => setPhase('message'), 500));
    
    // Phase 2: Message appears (500ms)
    timers.push(setTimeout(() => setPhase('subtitle'), 1000));
    
    // Phase 3: Subtitle appears (1000ms)
    // Phase 4: Fadeout starts after duration
    timers.push(setTimeout(() => setPhase('fadeout'), duration - 500));
    
    // Phase 5: Complete
    timers.push(setTimeout(() => {
      setPhase('done');
      onComplete();
    }, duration));

    return () => timers.forEach(clearTimeout);
  }, [isLoading, enabled, duration, onComplete]);

  // Don't render if disabled or done
  if ((!isLoading && !enabled) || phase === 'done') {
    return null;
  }

  // Show minimal loading while fetching settings
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-20 w-20 rounded-full bg-primary-foreground/20" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center",
        "bg-gradient-to-br from-primary via-primary/95 to-primary/85",
        "transition-opacity duration-500",
        phase === 'fadeout' && "opacity-0"
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
        <div className="absolute top-0 start-0 w-72 h-72 bg-primary-foreground/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 end-0 w-96 h-96 bg-primary-foreground/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Logo */}
      <div
        className={cn(
          "relative z-10 transition-all duration-700 ease-out",
          phase === 'logo' ? "scale-90 opacity-0" : "scale-100 opacity-100"
        )}
      >
        {activeLogoUrl ? (
          <img
            src={activeLogoUrl}
            alt={tenantName || 'Logo'}
            className="h-24 w-auto object-contain drop-shadow-2xl"
          />
        ) : (
          <div className="h-24 w-24 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center shadow-2xl">
            <span className="text-4xl font-bold text-primary-foreground">
              {tenantName?.charAt(0) || 'H'}
            </span>
          </div>
        )}
      </div>

      {/* Main Message */}
      <h1
        className={cn(
          "relative z-10 mt-8 text-2xl md:text-3xl font-bold text-primary-foreground text-center px-6",
          "transition-all duration-700 ease-out",
          ['message', 'subtitle', 'fadeout'].includes(phase)
            ? "translate-y-0 opacity-100"
            : "translate-y-4 opacity-0"
        )}
      >
        {message}
      </h1>

      {/* Subtitle */}
      <p
        className={cn(
          "relative z-10 mt-3 text-lg md:text-xl text-primary-foreground/80 text-center px-6",
          "transition-all duration-700 ease-out delay-200",
          ['subtitle', 'fadeout'].includes(phase)
            ? "translate-y-0 opacity-100"
            : "translate-y-4 opacity-0"
        )}
      >
        {subtitle}
      </p>

      {/* Loading dots */}
      <div className="relative z-10 mt-12 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary-foreground/60 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>

      {/* Tenant name at bottom */}
      {tenantName && (
        <div
          className={cn(
            "absolute bottom-8 text-sm text-primary-foreground/50",
            "transition-opacity duration-500",
            phase !== 'logo' ? "opacity-100" : "opacity-0"
          )}
        >
          {tenantName}
        </div>
      )}
    </div>
  );
}
