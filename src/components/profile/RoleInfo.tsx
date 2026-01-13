import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { RoleBadge } from "@/components/roles/RoleBadge";
import { UserRoleAssignment, RoleCategory } from "@/hooks/use-user-roles";

interface RoleInfoProps {
  roles: UserRoleAssignment[];
}

// Content-only version for use with ProfileCollapsibleCard
export function RoleInfoContent({ roles }: RoleInfoProps) {
  const { t } = useTranslation();

  // Group roles by category
  const rolesByCategory = roles.reduce((acc, userRole) => {
    const category = userRole.category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(userRole);
    return acc;
  }, {} as Record<RoleCategory, UserRoleAssignment[]>);

  const categoryOrder: RoleCategory[] = ['general', 'hsse', 'environmental', 'ptw', 'security', 'audit', 'food_safety'];

  return (
    <div className="rounded-md border p-3 bg-muted/10">
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 bg-primary/10 rounded-full flex-shrink-0">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-xs sm:text-sm font-medium leading-none">{t('role.currentRole')}</p>
          {roles.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('role.noRoles', 'No roles assigned')}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {categoryOrder.map(category => {
                const categoryRoles = rolesByCategory[category];
                if (!categoryRoles?.length) return null;
                return categoryRoles.map(role => (
                  <RoleBadge 
                    key={role.role_id} 
                    code={role.role_code}
                    name={role.role_name}
                    category={role.category}
                  />
                ));
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Legacy wrapper for backward compatibility
export function RoleInfo({ roles }: RoleInfoProps) {
  const { i18n } = useTranslation();
  const direction = i18n.dir();

  return (
    <div dir={direction}>
      <RoleInfoContent roles={roles} />
    </div>
  );
}
