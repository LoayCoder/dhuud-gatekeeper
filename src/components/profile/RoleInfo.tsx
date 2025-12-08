import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleBadge } from "@/components/roles/RoleBadge";
import { UserRoleAssignment, RoleCategory } from "@/hooks/use-user-roles";

interface RoleInfoProps {
  roles: UserRoleAssignment[];
}

export function RoleInfo({ roles }: RoleInfoProps) {
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('role.title')}</CardTitle>
        <CardDescription>
          {t('role.roleDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border p-4 bg-muted/10">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-full flex-shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-sm font-medium leading-none">{t('role.currentRole')}</p>
              {roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('role.noRoles', 'No roles assigned')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
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
      </CardContent>
    </Card>
  );
}
