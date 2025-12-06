import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import i18n from '@/i18n';

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  tenant_id: string;
  preferred_language: string | null;
  assigned_branch_id: string | null;
  assigned_site_id: string | null;
}

type UserRole = 'admin' | 'user';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  userRole: UserRole | null;
  isAdmin: boolean;
  mfaEnabled: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    // Use unified is_admin() function that checks both legacy and new role systems
    const { data: isAdminResult, error } = await supabase
      .rpc('is_admin', { p_user_id: userId });
    
    if (!error && isAdminResult) {
      setUserRole('admin');
    } else {
      // Default to 'user' if not admin
      setUserRole('user');
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, tenant_id, preferred_language, assigned_branch_id, assigned_site_id')
      .eq('id', userId)
      .single();
    
    if (data) {
      setProfile(data);
      
      // Apply user's preferred language if set
      if (data.preferred_language && data.preferred_language !== i18n.language) {
        i18n.changeLanguage(data.preferred_language);
      }
    }
  };

  const checkMFA = async () => {
    const { data: mfaData } = await supabase.auth.mfa.listFactors();
    const hasVerifiedMFA = (mfaData?.totp || []).some(f => f.status === 'verified');
    setMfaEnabled(hasVerifiedMFA);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await Promise.all([
        fetchProfile(user.id),
        fetchUserRole(user.id),
      ]);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          // Defer Supabase calls with setTimeout to prevent deadlock
          // Use Promise.all for parallel fetching
          setTimeout(() => {
            Promise.all([
              fetchProfile(newSession.user.id),
              fetchUserRole(newSession.user.id),
              checkMFA()
            ]);
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
          setMfaEnabled(false);
        }
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      
      if (existingSession?.user) {
        // Parallel fetch all data at once
        await Promise.all([
          fetchProfile(existingSession.user.id),
          fetchUserRole(existingSession.user.id),
          checkMFA()
        ]);
      }
      
      setIsLoading(false);
    };

    initializeAuth();

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    session,
    user,
    profile,
    userRole,
    isAdmin: userRole === 'admin',
    mfaEnabled,
    isLoading,
    isAuthenticated: !!session,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}