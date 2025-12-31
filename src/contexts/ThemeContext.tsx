import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme as useNextTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';

// Dhuud Platform tenant ID - used for default branding on public pages
const PLATFORM_TENANT_ID = '9290e913-c735-405c-91c6-141e966011ae';

// Type for tenant branding data (from DB or invitation)
export interface TenantBrandingData {
  name?: string;
  tenant_name?: string;
  brand_color?: string;
  secondary_color?: string | null;
  brand_color_dark?: string | null;
  secondary_color_dark?: string | null;
  logo_light_url?: string | null;
  logo_dark_url?: string | null;
  sidebar_icon_light_url?: string | null;
  sidebar_icon_dark_url?: string | null;
  app_icon_light_url?: string | null;
  app_icon_dark_url?: string | null;
  background_color?: string | null;
  background_theme?: string | null;
  background_image_url?: string | null;
  favicon_url?: string | null;
}

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
  applyTenantBranding: (branding: TenantBrandingData) => void;
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
  // Safely call useNextTheme - may be undefined during SSR or initial mount
  let theme: string | undefined;
  let setTheme: (theme: string) => void = () => {};
  let resolvedTheme: string | undefined;
  
  try {
    const nextTheme = useNextTheme();
    theme = nextTheme.theme;
    setTheme = nextTheme.setTheme;
    resolvedTheme = nextTheme.resolvedTheme;
  } catch {
    // next-themes context not available yet, use defaults
    theme = 'system';
    resolvedTheme = 'light';
  }
  
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

  // Helper function to update favicon in DOM
  const updateFavicon = useCallback((faviconSrc: string | null | undefined) => {
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
  }, []);

  // Apply full tenant branding from any data source (DB tenant or invitation data)
  const applyTenantBranding = useCallback((branding: TenantBrandingData) => {
    setTenantName(branding.tenant_name || branding.name || DEFAULT_TENANT_NAME);
    
    // Light mode
    setPrimaryColorLight(branding.brand_color || DEFAULT_PRIMARY_COLOR_LIGHT);
    setSecondaryColorLight(branding.secondary_color || '');
    setLogoLightUrl(branding.logo_light_url || null);
    setSidebarIconLightUrl(branding.sidebar_icon_light_url || null);
    setAppIconLightUrl(branding.app_icon_light_url || null);
    
    // Dark mode
    setPrimaryColorDark(branding.brand_color_dark || DEFAULT_PRIMARY_COLOR_DARK);
    setSecondaryColorDark(branding.secondary_color_dark || '');
    setLogoDarkUrl(branding.logo_dark_url || null);
    setSidebarIconDarkUrl(branding.sidebar_icon_dark_url || null);
    setAppIconDarkUrl(branding.app_icon_dark_url || null);
    
    // Background & favicon
    setBackgroundColor(branding.background_color || '');
    setBackgroundTheme((branding.background_theme as 'color' | 'image') || 'color');
    setBackgroundImageUrl(branding.background_image_url || null);
    setFaviconUrl(branding.favicon_url || null);
    
    // Update favicon in DOM
    updateFavicon(branding.favicon_url || branding.app_icon_light_url);
  }, [updateFavicon]);

  // Load Dhuud Platform branding (for public pages when no user is logged in)
  const loadPlatformBranding = useCallback(async () => {
    try {
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('name, brand_color, secondary_color, brand_color_dark, secondary_color_dark, background_theme, background_color, logo_light_url, logo_dark_url, sidebar_icon_light_url, sidebar_icon_dark_url, app_icon_light_url, app_icon_dark_url, background_image_url, favicon_url')
        .eq('id', PLATFORM_TENANT_ID)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch platform branding:', error);
        return;
      }

      if (tenant) {
        applyTenantBranding(tenant);
        setTenantId(PLATFORM_TENANT_ID);
      }
    } catch (error) {
      console.error('Error loading platform branding:', error);
    }
  }, [applyTenantBranding]);

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

  const refreshTenantData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If no session, load Dhuud Platform branding for public pages
      if (!session?.user) {
        await loadPlatformBranding();
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError || !profile?.tenant_id) {
        console.error('Failed to fetch profile:', profileError);
        await loadPlatformBranding();
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

      // Apply tenant branding and set tenant ID
      setTenantId(profile.tenant_id);
      applyTenantBranding(tenant);
    } catch (error) {
      console.error('Error refreshing tenant data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [applyTenantBranding, loadPlatformBranding]);

  // Listen for auth state changes
  useEffect(() => {
    refreshTenantData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setTimeout(() => {
          refreshTenantData();
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        // Load Dhuud branding on logout
        loadPlatformBranding();
        clearInvitationData();
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshTenantData, loadPlatformBranding]);

  // Apply the branding color to CSS variable for branding-specific elements ONLY
  // System UI colors (--primary, --secondary) are FIXED in index.css and NOT overridden
  useEffect(() => {
    // Only set brand-specific variables - used for login page, sidebar header, splash screen
    document.documentElement.style.setProperty('--brand-primary', activePrimaryColor);
    if (activeSecondaryColor) {
      document.documentElement.style.setProperty('--brand-accent', activeSecondaryColor);
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
        applyTenantBranding,
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