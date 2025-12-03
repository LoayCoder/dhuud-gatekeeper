import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldAlert } from 'lucide-react';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkAdminAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkAdminAccess();
      } else {
        setAuthenticated(false);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setAuthenticated(false);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setAuthenticated(true);

      // Check if user has admin role using unified is_admin() function
      const { data: isAdminResult, error } = await supabase
        .rpc('is_admin', { p_user_id: session.user.id });

      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!isAdminResult);
      }
    } catch (error) {
      console.error('Error in admin check:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/invite" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">{t('admin.accessDenied')}</h1>
          <p className="text-muted-foreground">
            {t('admin.noPermission')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('admin.adminOnlyAccess')}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}