import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Tenant {
  id: string;
  name: string;
  subscription_status: string | null;
  glass_break_active: boolean | null;
}

interface TenantSecuritySelectorProps {
  selectedTenantId: string | null;
  onTenantChange: (tenantId: string | null) => void;
}

export function TenantSecuritySelector({ selectedTenantId, onTenantChange }: TenantSecuritySelectorProps) {
  const { t } = useTranslation();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTenantId, setUserTenantId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function fetchTenants() {
      try {
        // Get current user's profile
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", user.id)
          .single();

        if (profile?.tenant_id) {
          setUserTenantId(profile.tenant_id);
        }

        // Check if user is super admin (can see all tenants)
        const { data: roleAssignment } = await supabase
          .from("user_role_assignments")
          .select("roles!inner(code)")
          .eq("user_id", user.id);

        const hasAdminRole = roleAssignment?.some((r: any) => r.roles?.code === "admin");
        setIsAdmin(!!hasAdminRole);

        if (hasAdminRole) {
          // Fetch all tenants for super admin
          const { data: tenantsData } = await supabase
            .from("tenants")
            .select("id, name, subscription_status, glass_break_active")
            .order("name");

          setTenants(tenantsData || []);
          
          // Auto-select user's tenant if none selected
          if (!selectedTenantId && profile?.tenant_id) {
            onTenantChange(profile.tenant_id);
          }
        } else if (profile?.tenant_id) {
          // Non-admin can only see their own tenant
          const { data: tenantData } = await supabase
            .from("tenants")
            .select("id, name, subscription_status, glass_break_active")
            .eq("id", profile.tenant_id)
            .single();

          if (tenantData) {
            setTenants([tenantData]);
            onTenantChange(tenantData.id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch tenants:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTenants();
  }, [selectedTenantId, onTenantChange]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{t("common.loading", "Loading...")}</span>
      </div>
    );
  }

  // If user is not admin, just show their tenant name
  if (!isAdmin && tenants.length === 1) {
    const tenant = tenants[0];
    return (
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{tenant.name}</span>
        {tenant.glass_break_active && (
          <Badge variant="destructive" className="gap-1">
            🔓 {t("security.glassBreakActive", "Glass Break Active")}
          </Badge>
        )}
      </div>
    );
  }

  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  return (
    <div className="flex items-center gap-3">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedTenantId || "all"}
        onValueChange={(value) => onTenantChange(value === "all" ? null : value)}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder={t("security.selectTenant", "Select tenant...")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {t("security.allTenants", "All Tenants")}
          </SelectItem>
          {tenants.map((tenant) => (
            <SelectItem key={tenant.id} value={tenant.id}>
              <div className="flex items-center gap-2">
                <span>{tenant.name}</span>
                {tenant.glass_break_active && (
                  <Badge variant="destructive" className="text-xs">🔓</Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedTenant?.glass_break_active && (
        <Badge variant="destructive" className="gap-1">
          🔓 {t("security.glassBreakActive", "Glass Break Active")}
        </Badge>
      )}
    </div>
  );
}
