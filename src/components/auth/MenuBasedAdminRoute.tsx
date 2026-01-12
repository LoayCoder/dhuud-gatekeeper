import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/ui/page-loader";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MenuBasedAdminRouteProps {
  children: React.ReactNode;
  menuCode: string;
}

/**
 * A flexible route protection component that grants access if:
 * 1. User is an admin (always has access), OR
 * 2. User has been granted access to the specific menu via user_menu_access
 */
export function MenuBasedAdminRoute({ children, menuCode }: MenuBasedAdminRouteProps) {
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

        // Check if user is admin - admins always have access
        const { data: isAdmin } = await supabase.rpc('is_admin', { p_user_id: session.user.id });

        if (isAdmin) {
          setHasAccess(true);
          setLoading(false);
          return;
        }

        // Check if user has menu access via get_accessible_menu_items
        const { data: menuItems, error } = await supabase.rpc('get_accessible_menu_items', {
          _user_id: session.user.id
        });

        if (error) {
          console.error('Error checking menu access:', error);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // Check if the user has access to the specified menu code
        const hasMenuAccess = (menuItems || []).some(
          (item: { menu_code: string }) => item.menu_code === menuCode
        );

        setHasAccess(hasMenuAccess);
      } catch (error) {
        console.error('Error checking access:', error);
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
  }, [menuCode]);

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
            {t('admin.menuAccessRequired', 'You do not have permission to access this page.')}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
