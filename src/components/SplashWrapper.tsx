import { useState, useCallback } from 'react';
import { SplashScreen } from './SplashScreen';
import { useTheme } from '@/contexts/ThemeContext';
import { PageLoader } from './ui/page-loader';

interface SplashWrapperProps {
  children: React.ReactNode;
}

/**
 * SplashWrapper - Only shows splash screen for authenticated users
 * after tenant branding has loaded. This prevents the blue wash-out
 * effect on public pages like /invite, /login, /signup.
 */
export function SplashWrapper({ children }: SplashWrapperProps) {
  const { isLoading: themeLoading } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Wait for theme/branding to load before showing splash
  // This ensures splash uses tenant colors, not default blue
  if (themeLoading) {
    return <PageLoader />;
  }

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      {children}
    </>
  );
}
