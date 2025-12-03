import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";

interface TenantInfoProps {
  memberSince: string | null;
}

export function TenantInfo({ memberSince }: TenantInfoProps) {
  const { t } = useTranslation();
  const { tenantName, activeSidebarIconUrl, activePrimaryColor } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-start">{t('tenant.organization')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center text-center p-4 border rounded-lg bg-muted/10">
          <div 
            className="h-16 w-16 rounded-full flex items-center justify-center mb-3 shadow-sm border"
            style={{ backgroundColor: activePrimaryColor ? `hsl(${activePrimaryColor})` : 'hsl(var(--primary))' }}
          >
            {activeSidebarIconUrl ? (
              <img 
                src={activeSidebarIconUrl} 
                alt={tenantName} 
                className="h-10 w-10 object-contain" 
              />
            ) : (
              <Building2 className="h-8 w-8 text-primary-foreground" />
            )}
          </div>
          <h3 className="font-semibold">{tenantName}</h3>
          <p className="text-xs text-muted-foreground mt-1">{t('navigation.enterpriseHsse')}</p>
        </div>

        <div className="space-y-2 text-start">
          <div className="text-sm grid gap-2">
            <div className="flex justify-between py-2 border-b rtl:flex-row-reverse">
              <span className="text-muted-foreground">{t('common.status')}</span>
              <span className="text-green-600 font-medium flex items-center gap-1 rtl:flex-row-reverse">
                <span className="h-2 w-2 rounded-full bg-green-600 inline-block" />
                {t('common.active')}
              </span>
            </div>
            {memberSince && (
              <div className="flex justify-between py-2 border-b rtl:flex-row-reverse">
                <span className="text-muted-foreground">{t('tenant.memberSince')}</span>
                <span>{new Date(memberSince).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
