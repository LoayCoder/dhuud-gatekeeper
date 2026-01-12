import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLoader } from "@/components/ui/page-loader";
import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

interface HSSERouteProps {
  children: React.ReactNode;
}

interface MenuAccessItem {
  menu_code: string;
  menu_url: string | null;
  parent_code: string | null;
  sort_order: number;
}

export function HSSERoute({ children }: HSSERouteProps) {
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

        // Check if user is admin first
        const { data: isAdmin } = await supabase.rpc('is_admin', { p_user_id: session.user.id });

        if (isAdmin) {
          setHasAccess(true);
          setLoading(false);
          return;
        }

        // Check if user has access to HSSE section via menu access configuration
        const { data: menuItems, error } = await supabase.rpc('get_accessible_menu_items', {
          _user_id: session.user.id
        });

        if (error) {
          console.error('Error fetching menu items:', error);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // User has HSSE access if they can access HSSE-related menu items
        const hasHSSEAccess = (menuItems as MenuAccessItem[] || []).some(
          (item) => 
            item.menu_code === 'hsse' || 
            item.parent_code === 'hsse' ||
            item.menu_code.startsWith('hsse_') ||
            item.menu_code === 'incidents' ||
            item.menu_code === 'investigations' ||
            item.parent_code === 'incidents'
        );

        setHasAccess(hasHSSEAccess);
      } catch (error) {
        console.error('Error checking HSSE access:', error);
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
            {t('investigation.accessRequired', 'You need HSSE or admin privileges to access this page.')}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
