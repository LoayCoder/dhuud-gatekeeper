import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  tenant_id: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
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
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, tenant_id')
      .eq('id', userId)
      .single();
    
    if (data) {
      setProfile(data);
    }
  };

  const checkMFA = async () => {
    const { data: mfaData } = await supabase.auth.mfa.listFactors();
    const hasVerifiedMFA = (mfaData?.totp || []).some(f => f.status === 'verified');
    setMfaEnabled(hasVerifiedMFA);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
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
          setTimeout(() => {
            fetchProfile(newSession.user.id);
            checkMFA();
          }, 0);
        } else {
          setProfile(null);
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
        await Promise.all([
          fetchProfile(existingSession.user.id),
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
