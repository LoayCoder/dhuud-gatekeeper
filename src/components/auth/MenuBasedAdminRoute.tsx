import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/ui/page-loader";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";
import { MenuPermissionsProvider } from "@/contexts/MenuPermissionsContext";

interface MenuBasedAdminRouteProps {
  children: React.ReactNode;
  menuCode: string;
}

/**
 * A flexible route protection component that grants access if:
 * 1. User is an admin (always has access), OR
 * 2. User has been granted access to the specific menu via user_menu_access
 * 
 * Additionally provides MenuPermissionsContext to children for CRUD permission checks.
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
        
        console.log('=== MenuBasedAdminRoute Debug ===');
        console.log('Menu Code:', menuCode);
        console.log('Session:', session ? 'EXISTS' : 'NULL');
        
        if (!session?.user) {
          console.log('❌ No session - redirecting to login');
          setAuthenticated(false);
          setLoading(false);
          return;
        }

        console.log('User ID:', session.user.id);
        console.log('User Email:', session.user.email);
        setAuthenticated(true);

        // Check if user is admin - admins always have access
        const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin', { p_user_id: session.user.id });

        console.log('is_admin RPC result:', isAdmin, 'error:', adminError);

        if (isAdmin) {
          console.log('✅ User is admin - granting access');
          setHasAccess(true);
          setLoading(false);
          return;
        }

        // Check if user has menu access via get_accessible_menu_items
        const { data: menuItems, error } = await supabase.rpc('get_accessible_menu_items', {
          _user_id: session.user.id
        });

        console.log('get_accessible_menu_items result:', menuItems);
        console.log('get_accessible_menu_items error:', error);

        if (error) {
          logger.error('Error checking menu access:', error);
          console.log('❌ Error fetching menu items');
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // Check if the user has access to the specified menu code
        const hasMenuAccess = (menuItems || []).some(
          (item: { menu_code: string }) => item.menu_code === menuCode
        );

        console.log('Looking for menu_code:', menuCode);
        console.log('Has menu access:', hasMenuAccess);
        console.log('=== End Debug ===');

        setHasAccess(hasMenuAccess);
      } catch (error) {
        logger.error('Error checking access:', error);
        console.log('❌ Exception during access check:', error);
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

  // Wrap children with MenuPermissionsProvider for CRUD permission context
  return (
    <MenuPermissionsProvider menuCode={menuCode}>
      {children}
    </MenuPermissionsProvider>
  );
}
