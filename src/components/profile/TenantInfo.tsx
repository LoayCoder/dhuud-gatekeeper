import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";

interface TenantInfoProps {
  memberSince: string | null;
}

export function TenantInfo({ memberSince }: TenantInfoProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { tenantName, activeSidebarIconUrl, activePrimaryColor } = useTheme();

  return (
    <Card className="border-border/50 bg-card/80 shadow-sm backdrop-blur-sm" dir={direction}>
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="text-sm sm:text-base font-semibold tracking-tight text-start">
          {t('tenant.organization')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-col items-center text-center p-3 border rounded-lg bg-muted/10">
          <div 
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center mb-2 shadow-sm border"
            style={{ backgroundColor: activePrimaryColor ? `hsl(${activePrimaryColor})` : 'hsl(var(--primary))' }}
          >
            {activeSidebarIconUrl ? (
              <img 
                src={activeSidebarIconUrl} 
                alt={tenantName} 
                className="h-7 w-7 sm:h-8 sm:w-8 object-contain" 
              />
            ) : (
              <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
            )}
          </div>
          <h3 className="font-semibold text-sm sm:text-base">{tenantName}</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{t('navigation.enterpriseHsse')}</p>
        </div>

        <div className="text-start">
          <div className="text-xs sm:text-sm space-y-1">
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-muted-foreground">{t('common.status')}</span>
              <span className="text-green-600 font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-600 inline-block" />
                {t('common.active')}
              </span>
            </div>
            {memberSince && (
              <div className="flex justify-between py-1.5 border-b">
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
