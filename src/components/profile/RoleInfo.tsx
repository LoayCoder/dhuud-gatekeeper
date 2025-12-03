import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RoleInfoProps {
  role: string;
}

export function RoleInfo({ role }: RoleInfoProps) {
  const { t } = useTranslation();

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
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-full flex-shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium leading-none">{t('role.currentRole')}</p>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-semibold text-foreground capitalize">{role}</span>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
