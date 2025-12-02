import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme as useNextTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';

interface ThemeContextType {
  // Light mode colors
  primaryColorLight: string;
  setPrimaryColorLight: (color: string) => void;
  secondaryColorLight: string;
  setSecondaryColorLight: (color: string) => void;
  // Dark mode colors
  primaryColorDark: string;
  setPrimaryColorDark: (color: string) => void;
  secondaryColorDark: string;
  setSecondaryColorDark: (color: string) => void;
  // Active colors (based on current theme)
  activePrimaryColor: string;
  activeSecondaryColor: string;
  // Background settings
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  backgroundTheme: 'color' | 'image';
  setBackgroundTheme: (theme: 'color' | 'image') => void;
  backgroundImageUrl: string | null;
  setBackgroundImageUrl: (url: string | null) => void;
  // Tenant info
  tenantName: string;
  setTenantName: (name: string) => void;
  tenantId: string | null;
  setTenantId: (id: string | null) => void;
  // Light mode assets
  logoLightUrl: string | null;
  setLogoLightUrl: (url: string | null) => void;
  sidebarIconLightUrl: string | null;
  setSidebarIconLightUrl: (url: string | null) => void;
  appIconLightUrl: string | null;
  setAppIconLightUrl: (url: string | null) => void;
  // Dark mode assets
  logoDarkUrl: string | null;
  setLogoDarkUrl: (url: string | null) => void;
  sidebarIconDarkUrl: string | null;
  setSidebarIconDarkUrl: (url: string | null) => void;
  appIconDarkUrl: string | null;
  setAppIconDarkUrl: (url: string | null) => void;
  // Active assets (based on current theme)
  activeLogoUrl: string | null;
  activeSidebarIconUrl: string | null;
  activeAppIconUrl: string | null;
  // Favicon (same for both modes)
  faviconUrl: string | null;
  setFaviconUrl: (url: string | null) => void;
  // Theme mode
  colorMode: string | undefined;
  setColorMode: (mode: string) => void;
  resolvedMode: string | undefined;
  // Invitation data
  invitationEmail: string | null;
  invitationCode: string | null;
  isCodeValidated: boolean;
  setInvitationData: (email: string, code: string, tenantId: string) => void;
  clearInvitationData: () => void;
  refreshTenantData: () => Promise<void>;
  isLoading: boolean;
  // Legacy compatibility (maps to light mode)
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  secondaryColor: string;
  setSecondaryColor: (color: string) => void;
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
  sidebarIconUrl: string | null;
  setSidebarIconUrl: (url: string | null) => void;
  appIconUrl: string | null;
  setAppIconUrl: (url: string | null) => void;
}

const DEFAULT_PRIMARY_COLOR_LIGHT = '221.2 83.2% 53.3%';
const DEFAULT_PRIMARY_COLOR_DARK = '217 91% 60%';
const DEFAULT_TENANT_NAME = 'Dhuud Platform';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  
  // Light mode colors
  const [primaryColorLight, setPrimaryColorLight] = useState(DEFAULT_PRIMARY_COLOR_LIGHT);
  const [secondaryColorLight, setSecondaryColorLight] = useState('');
  // Dark mode colors
  const [primaryColorDark, setPrimaryColorDark] = useState(DEFAULT_PRIMARY_COLOR_DARK);
  const [secondaryColorDark, setSecondaryColorDark] = useState('');
  
  // Background settings
  const [backgroundColor, setBackgroundColor] = useState('');
  const [backgroundTheme, setBackgroundTheme] = useState<'color' | 'image'>('color');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  
  // Tenant info
  const [tenantName, setTenantName] = useState(DEFAULT_TENANT_NAME);
  const [tenantId, setTenantId] = useState<string | null>(null);
  
  // Light mode assets
  const [logoLightUrl, setLogoLightUrl] = useState<string | null>(null);
  const [sidebarIconLightUrl, setSidebarIconLightUrl] = useState<string | null>(null);
  const [appIconLightUrl, setAppIconLightUrl] = useState<string | null>(null);
  
  // Dark mode assets
  const [logoDarkUrl, setLogoDarkUrl] = useState<string | null>(null);
  const [sidebarIconDarkUrl, setSidebarIconDarkUrl] = useState<string | null>(null);
  const [appIconDarkUrl, setAppIconDarkUrl] = useState<string | null>(null);
  
  // Favicon (same for both modes)
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  
  // Invitation state
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [isCodeValidated, setIsCodeValidated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Computed active values based on resolved theme
  const isDark = resolvedTheme === 'dark';
  
  const activePrimaryColor = useMemo(() => 
    isDark ? primaryColorDark : primaryColorLight, 
    [isDark, primaryColorDark, primaryColorLight]
  );
  
  const activeSecondaryColor = useMemo(() => 
    isDark ? secondaryColorDark : secondaryColorLight, 
    [isDark, secondaryColorDark, secondaryColorLight]
  );
  
  const activeLogoUrl = useMemo(() => 
    isDark ? (logoDarkUrl || logoLightUrl) : logoLightUrl, 
    [isDark, logoDarkUrl, logoLightUrl]
  );
  
  const activeSidebarIconUrl = useMemo(() => 
    isDark ? (sidebarIconDarkUrl || sidebarIconLightUrl) : sidebarIconLightUrl, 
    [isDark, sidebarIconDarkUrl, sidebarIconLightUrl]
  );
  
  const activeAppIconUrl = useMemo(() => 
    isDark ? (appIconDarkUrl || appIconLightUrl) : appIconLightUrl, 
    [isDark, appIconDarkUrl, appIconLightUrl]
  );

  const setInvitationData = (email: string, code: string, tenantIdValue: string) => {
    setInvitationEmail(email);
    setInvitationCode(code);
    setTenantId(tenantIdValue);
    setIsCodeValidated(true);
  };

  const clearInvitationData = () => {
    setInvitationEmail(null);
    setInvitationCode(null);
    setIsCodeValidated(false);
  };

  const resetToDefaults = useCallback(() => {
    setPrimaryColorLight(DEFAULT_PRIMARY_COLOR_LIGHT);
    setPrimaryColorDark(DEFAULT_PRIMARY_COLOR_DARK);
    setSecondaryColorLight('');
    setSecondaryColorDark('');
    setBackgroundColor('');
    setBackgroundTheme('color');
    setBackgroundImageUrl(null);
    setTenantName(DEFAULT_TENANT_NAME);
    setLogoLightUrl(null);
    setLogoDarkUrl(null);
    setSidebarIconLightUrl(null);
    setSidebarIconDarkUrl(null);
    setAppIconLightUrl(null);
    setAppIconDarkUrl(null);
    setTenantId(null);
  }, []);

  const refreshTenantData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        resetToDefaults();
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError || !profile?.tenant_id) {
        console.error('Failed to fetch profile:', profileError);
        return;
      }

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('name, brand_color, secondary_color, brand_color_dark, secondary_color_dark, background_theme, background_color, logo_light_url, logo_dark_url, sidebar_icon_light_url, sidebar_icon_dark_url, app_icon_light_url, app_icon_dark_url, background_image_url, favicon_url')
        .eq('id', profile.tenant_id)
        .maybeSingle();

      if (tenantError || !tenant) {
        console.error('Failed to fetch tenant:', tenantError);
        return;
      }

      // Update state with tenant branding
      setTenantId(profile.tenant_id);
      setTenantName(tenant.name || DEFAULT_TENANT_NAME);
      
      // Light mode
      setPrimaryColorLight(tenant.brand_color || DEFAULT_PRIMARY_COLOR_LIGHT);
      setSecondaryColorLight(tenant.secondary_color || '');
      setLogoLightUrl(tenant.logo_light_url);
      setSidebarIconLightUrl(tenant.sidebar_icon_light_url);
      setAppIconLightUrl(tenant.app_icon_light_url);
      
      // Dark mode
      setPrimaryColorDark(tenant.brand_color_dark || DEFAULT_PRIMARY_COLOR_DARK);
      setSecondaryColorDark(tenant.secondary_color_dark || '');
      setLogoDarkUrl(tenant.logo_dark_url);
      setSidebarIconDarkUrl(tenant.sidebar_icon_dark_url);
      setAppIconDarkUrl(tenant.app_icon_dark_url);
      
      // Background & favicon
      setBackgroundColor(tenant.background_color || '');
      setBackgroundTheme((tenant.background_theme as 'color' | 'image') || 'color');
      setBackgroundImageUrl(tenant.background_image_url);
      setFaviconUrl(tenant.favicon_url);

      // Update Favicon dynamically
      const faviconSrc = tenant.favicon_url || tenant.app_icon_light_url;
      if (faviconSrc) {
        const existingLink = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
        const link = existingLink || document.createElement('link');
        link.type = faviconSrc.endsWith('.ico') ? 'image/x-icon' : 'image/png';
        link.rel = 'icon';
        link.href = faviconSrc;
        if (!existingLink) {
          document.getElementsByTagName('head')[0].appendChild(link);
        }
      }
    } catch (error) {
      console.error('Error refreshing tenant data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [resetToDefaults]);

  // Listen for auth state changes
  useEffect(() => {
    refreshTenantData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setTimeout(() => {
          refreshTenantData();
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        resetToDefaults();
        clearInvitationData();
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshTenantData, resetToDefaults]);

  // Apply the primary color to CSS variable based on resolved theme
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', activePrimaryColor);
    if (activeSecondaryColor) {
      document.documentElement.style.setProperty('--secondary', activeSecondaryColor);
    }
  }, [activePrimaryColor, activeSecondaryColor]);

  return (
    <ThemeContext.Provider
      value={{
        // Light mode colors
        primaryColorLight,
        setPrimaryColorLight,
        secondaryColorLight,
        setSecondaryColorLight,
        // Dark mode colors
        primaryColorDark,
        setPrimaryColorDark,
        secondaryColorDark,
        setSecondaryColorDark,
        // Active colors
        activePrimaryColor,
        activeSecondaryColor,
        // Background
        backgroundColor,
        setBackgroundColor,
        backgroundTheme,
        setBackgroundTheme,
        backgroundImageUrl,
        setBackgroundImageUrl,
        // Tenant
        tenantName,
        setTenantName,
        tenantId,
        setTenantId,
        // Light mode assets
        logoLightUrl,
        setLogoLightUrl,
        sidebarIconLightUrl,
        setSidebarIconLightUrl,
        appIconLightUrl,
        setAppIconLightUrl,
        // Dark mode assets
        logoDarkUrl,
        setLogoDarkUrl,
        sidebarIconDarkUrl,
        setSidebarIconDarkUrl,
        appIconDarkUrl,
        setAppIconDarkUrl,
        // Active assets
        activeLogoUrl,
        activeSidebarIconUrl,
        activeAppIconUrl,
        // Favicon
        faviconUrl,
        setFaviconUrl,
        // Theme mode
        colorMode: theme,
        setColorMode: setTheme,
        resolvedMode: resolvedTheme,
        // Invitation
        invitationEmail,
        invitationCode,
        isCodeValidated,
        setInvitationData,
        clearInvitationData,
        refreshTenantData,
        isLoading,
        // Legacy compatibility (maps to light mode)
        primaryColor: primaryColorLight,
        setPrimaryColor: setPrimaryColorLight,
        secondaryColor: secondaryColorLight,
        setSecondaryColor: setSecondaryColorLight,
        logoUrl: logoLightUrl,
        setLogoUrl: setLogoLightUrl,
        sidebarIconUrl: sidebarIconLightUrl,
        setSidebarIconUrl: setSidebarIconLightUrl,
        appIconUrl: appIconLightUrl,
        setAppIconUrl: setAppIconLightUrl,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
