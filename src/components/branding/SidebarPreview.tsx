import { Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface SidebarPreviewProps {
  sidebarIconUrl: string | null;
  primaryColor: string;
  tenantName: string;
  isDark?: boolean;
}

export function SidebarPreview({ sidebarIconUrl, primaryColor, tenantName, isDark = false }: SidebarPreviewProps) {
  const { t } = useTranslation();
  
  return (
    <div className={cn(
      "border rounded-lg p-4 transition-colors",
      isDark ? "bg-slate-900 border-slate-700" : "bg-sidebar"
    )}>
      <div className="flex items-center gap-3 ltr:flex-row rtl:flex-row-reverse">
        <div className="size-10 flex items-center justify-center">
          {sidebarIconUrl ? (
            <img src={sidebarIconUrl} alt="Icon" className="size-10 object-contain" />
          ) : (
            <Shield className="size-7 text-primary" style={{ color: primaryColor ? `hsl(${primaryColor})` : undefined }} />
          )}
        </div>
        <div className="ltr:text-left rtl:text-right leading-tight">
          <span className={cn(
            "font-semibold text-sm block truncate max-w-[140px]",
            isDark ? "text-white" : "text-sidebar-foreground"
          )}>
            {tenantName || t('adminBranding.preview.defaultCompany')}
          </span>
          <span className={cn(
            "text-xs",
            isDark ? "text-slate-400" : "text-muted-foreground"
          )}>
            {t('adminBranding.preview.enterpriseHsse')}
          </span>
        </div>
      </div>
    </div>
  );
}
