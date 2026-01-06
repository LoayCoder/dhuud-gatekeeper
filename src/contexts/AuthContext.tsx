import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import i18n from '@/i18n';
import { useProfileEmailWatcher } from '@/hooks/use-profile-email-watcher';

// Prevent HMR from creating multiple contexts
if (import.meta.hot) {
  import.meta.hot.accept();
}

interface Profile {
  full_name: string | null;
  avatar_url: string | null;
  tenant_id: string;
  preferred_language: string | null;
  assigned_branch_id: string | null;
  assigned_site_id: string | null;
  assigned_department_id: string | null;
  contractor_company_name: string | null;
  is_deleted?: boolean;
  is_active?: boolean;
}

type UserRole = 'admin' | 'user';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  userRole: UserRole | null;
  isAdmin: boolean;
  mfaEnabled: boolean;
  tenantMfaVerified: boolean; // NEW: Tenant-scoped MFA verification status
  isLoading: boolean;
  isAuthenticated: boolean;
  currentTenantId: string | null; // NEW: Current tenant context
  refreshProfile: () => Promise<void>;
  validateTenantAccess: () => Promise<boolean>; // NEW: Validate access for current tenant
}

// Create context outside of component to ensure singleton across HMR
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [tenantMfaVerified, setTenantMfaVerified] = useState(false);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
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
      .select('full_name, avatar_url, tenant_id, preferred_language, assigned_branch_id, assigned_site_id, assigned_department_id, contractor_company_name, is_deleted, is_active')
      .eq('id', userId)
      .single();
    
    if (data) {
      // SECURITY: Check if user is deleted or inactive
      if (data.is_deleted === true || data.is_active === false) {
        console.warn('Deleted/inactive user detected in profile fetch:', userId);
        // Sign out the user immediately
        await supabase.auth.signOut();
        setProfile(null);
        setCurrentTenantId(null);
        return;
      }
      
      setProfile(data);
      setCurrentTenantId(data.tenant_id);
      
      // Apply user's preferred language if set
      if (data.preferred_language && data.preferred_language !== i18n.language) {
        i18n.changeLanguage(data.preferred_language);
      }

      // Check tenant-scoped MFA status
      await checkTenantMfaStatus(userId, data.tenant_id);
    }
  };

  const checkTenantMfaStatus = async (userId: string, tenantId: string) => {
    const { data } = await supabase
      .from('tenant_user_mfa_status')
      .select('requires_setup, mfa_verified_at')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();
    
    // MFA is verified for this tenant if record exists and requires_setup is false
    setTenantMfaVerified(data ? !data.requires_setup : false);
  };

  const checkMFA = async () => {
    const { data: mfaData } = await supabase.auth.mfa.listFactors();
    const hasVerifiedMFA = (mfaData?.totp || []).some(f => f.status === 'verified');
    setMfaEnabled(hasVerifiedMFA);
  };

  // Validate that user can access their current tenant
  const validateTenantAccess = async (): Promise<boolean> => {
    if (!user?.id || !currentTenantId) return false;
    
    try {
      const { data, error } = await supabase.functions.invoke('validate-user-access', {
        body: { target_tenant_id: currentTenantId }
      });
      
      if (error || !data?.allowed) {
        console.warn('Tenant access validation failed:', data?.reason || error?.message);
        // Sign out if user is deleted or inactive
        if (data?.reason === 'user_deleted' || data?.reason === 'user_inactive') {
          await supabase.auth.signOut();
        }
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error validating tenant access:', err);
      return false;
    }
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
          setTenantMfaVerified(false);
          setCurrentTenantId(null);
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
    tenantMfaVerified,
    isLoading,
    isAuthenticated: !!session,
    currentTenantId,
    refreshProfile,
    validateTenantAccess,
  };

  // Watch for email changes from admin actions
  useProfileEmailWatcher({
    userId: user?.id,
    sessionEmail: user?.email,
    enabled: !!session && !isLoading
  });

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