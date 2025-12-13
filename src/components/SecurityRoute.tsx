import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/ui/page-loader";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SecurityRouteProps {
  children: React.ReactNode;
}

export function SecurityRoute({ children }: SecurityRouteProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setAuthenticated(false);
          setLoading(false);
          return;
        }

        setAuthenticated(true);

        // Check if user is admin
        const { data: isAdmin } = await supabase.rpc('is_admin', { p_user_id: session.user.id });

        if (isAdmin) {
          setHasAccess(true);
          setLoading(false);
          return;
        }

        // Check if user has security roles via user_role_assignments
        const { data: roles } = await supabase
          .from('user_role_assignments')
          .select('role:roles(code)')
          .eq('user_id', session.user.id)
          .is('deleted_at', null);

        const roleCodes = roles?.map(r => (r.role as { code: string })?.code) || [];
        const hasSecurityRole = roleCodes.some(code => 
          code === 'security_officer' || code === 'security_supervisor'
        );

        setHasAccess(hasSecurityRole);
      } catch (error) {
        console.error('Error checking security access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAccess();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  if (!authenticated) {
    return <Navigate to="/invite" replace />;
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center">
          <ShieldAlert className="mx-auto h-16 w-16 text-destructive" />
          <h1 className="mt-4 text-2xl font-bold text-foreground">
            {t('common.accessDenied', 'Access Denied')}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t('security.accessRequired', 'You need security or admin privileges to access this page.')}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
