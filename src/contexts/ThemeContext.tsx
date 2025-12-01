import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  tenantName: string;
  setTenantName: (name: string) => void;
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
  invitationEmail: string | null;
  invitationCode: string | null;
  isCodeValidated: boolean;
  setInvitationData: (email: string, code: string) => void;
  clearInvitationData: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [primaryColor, setPrimaryColor] = useState('221.2 83.2% 53.3%');
  const [tenantName, setTenantName] = useState('Dhuud Platform');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
  const [invitationCode, setInvitationCode] = useState<string | null>(null);
  const [isCodeValidated, setIsCodeValidated] = useState(false);

  const setInvitationData = (email: string, code: string) => {
    setInvitationEmail(email);
    setInvitationCode(code);
    setIsCodeValidated(true);
  };

  const clearInvitationData = () => {
    setInvitationEmail(null);
    setInvitationCode(null);
    setIsCodeValidated(false);
  };

  useEffect(() => {
    // Apply the primary color to CSS variable
    document.documentElement.style.setProperty('--primary', primaryColor);
  }, [primaryColor]);

  return (
    <ThemeContext.Provider
      value={{
        primaryColor,
        setPrimaryColor,
        tenantName,
        setTenantName,
        logoUrl,
        setLogoUrl,
        invitationEmail,
        invitationCode,
        isCodeValidated,
        setInvitationData,
        clearInvitationData,
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
