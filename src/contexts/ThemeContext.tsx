import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ThemeContextType {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  secondaryColor: string;
  setSecondaryColor: (color: string) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  backgroundTheme: 'color' | 'image';
  setBackgroundTheme: (theme: 'color' | 'image') => void;
  backgroundImageUrl: string | null;
  setBackgroundImageUrl: (url: string | null) => void;
  tenantName: string;
  setTenantName: (name: string) => void;
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
  appIconUrl: string | null;
  setAppIconUrl: (url: string | null) => void;
  tenantId: string | null;
  setTenantId: (id: string | null) => void;
  invitationEmail: string | null;
  invitationCode: string | null;
  isCodeValidated: boolean;
  setInvitationData: (email: string, code: string, tenantId: string) => void;
  clearInvitationData: () => void;
  refreshTenantData: () => Promise<void>;
}

const DEFAULT_PRIMARY_COLOR = '221.2 83.2% 53.3%';
const DEFAULT_TENANT_NAME = 'Dhuud Platform';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY_COLOR);
  const [secondaryColor, setSecondaryColor] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('');
  const [backgroundTheme, setBackgroundTheme] = useState<'color' | 'image'>('color');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState(DEFAULT_TENANT_NAME);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [appIconUrl, setAppIconUrl] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [isCodeValidated, setIsCodeValidated] = useState(false);

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
    setPrimaryColor(DEFAULT_PRIMARY_COLOR);
    setSecondaryColor('');
    setBackgroundColor('');
    setBackgroundTheme('color');
    setBackgroundImageUrl(null);
    setTenantName(DEFAULT_TENANT_NAME);
    setLogoUrl(null);
    setAppIconUrl(null);
    setTenantId(null);
  }, []);

  const refreshTenantData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        resetToDefaults();
        return;
      }

      // Fetch user's profile to get tenant_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError || !profile?.tenant_id) {
        console.error('Failed to fetch profile:', profileError);
        return;
      }

      // Fetch tenant details with new branding fields
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('name, brand_color, secondary_color, background_theme, background_color, logo_url, app_icon_url, background_image_url')
        .eq('id', profile.tenant_id)
        .maybeSingle();

      if (tenantError || !tenant) {
        console.error('Failed to fetch tenant:', tenantError);
        return;
      }

      // Update state with tenant branding
      setTenantId(profile.tenant_id);
      setTenantName(tenant.name || DEFAULT_TENANT_NAME);
      setPrimaryColor(tenant.brand_color || DEFAULT_PRIMARY_COLOR);
      setSecondaryColor(tenant.secondary_color || '');
      setBackgroundColor(tenant.background_color || '');
      setBackgroundTheme((tenant.background_theme as 'color' | 'image') || 'color');
      setLogoUrl(tenant.logo_url);
      setAppIconUrl(tenant.app_icon_url);
      setBackgroundImageUrl(tenant.background_image_url);
    } catch (error) {
      console.error('Error refreshing tenant data:', error);
    }
  }, [resetToDefaults]);

  // Listen for auth state changes
  useEffect(() => {
    // Refresh tenant data on mount
    refreshTenantData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        // Use setTimeout to avoid Supabase deadlock
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

  // Apply the primary color to CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', primaryColor);
  }, [primaryColor]);

  return (
    <ThemeContext.Provider
      value={{
        primaryColor,
        setPrimaryColor,
        secondaryColor,
        setSecondaryColor,
        backgroundColor,
        setBackgroundColor,
        backgroundTheme,
        setBackgroundTheme,
        backgroundImageUrl,
        setBackgroundImageUrl,
        tenantName,
        setTenantName,
        logoUrl,
        setLogoUrl,
        appIconUrl,
        setAppIconUrl,
        tenantId,
        setTenantId,
        invitationEmail,
        invitationCode,
        isCodeValidated,
        setInvitationData,
        clearInvitationData,
        refreshTenantData,
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
