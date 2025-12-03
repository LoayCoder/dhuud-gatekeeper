import { Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface LoginPreviewProps {
  logoUrl: string | null;
  primaryColor: string;
  tenantName: string;
  isDark?: boolean;
}

export function LoginPreview({ logoUrl, primaryColor, tenantName, isDark = false }: LoginPreviewProps) {
  const { t } = useTranslation();
  
  return (
    <div className={cn(
      "border rounded-lg p-4 space-y-4 transition-colors",
      isDark ? "bg-slate-900 border-slate-700" : "bg-card"
    )}>
      {/* Logo/Icon */}
      <div className="flex flex-col items-center text-center">
        {logoUrl ? (
          <img src={logoUrl} alt={tenantName} className="h-8 object-contain mb-2" />
        ) : (
          <div 
            className="h-10 w-10 rounded-full flex items-center justify-center mb-2"
            style={{ backgroundColor: primaryColor ? `hsl(${primaryColor} / 0.15)` : 'hsl(var(--primary) / 0.15)' }}
          >
            <Shield 
              className="h-5 w-5" 
              style={{ color: primaryColor ? `hsl(${primaryColor})` : 'hsl(var(--primary))' }}
            />
          </div>
        )}
        <span className={cn(
          "font-semibold text-sm",
          isDark ? "text-white" : "text-foreground"
        )}>
          {tenantName || t('adminBranding.preview.defaultCompany')}
        </span>
        <span className={cn(
          "text-xs",
          isDark ? "text-slate-400" : "text-muted-foreground"
        )}>
          {t('adminBranding.preview.signInPrompt')}
        </span>
      </div>

      {/* Mock Form */}
      <div className="space-y-2">
        <div className={cn(
          "h-8 rounded border text-xs flex items-center px-2 ltr:text-left rtl:text-right",
          isDark ? "bg-slate-800 border-slate-600 text-slate-500" : "bg-muted/30 border-input text-muted-foreground"
        )}>
          {t('adminBranding.preview.emailPlaceholder')}
        </div>
        <div className={cn(
          "h-8 rounded border text-xs flex items-center px-2 ltr:text-left rtl:text-right",
          isDark ? "bg-slate-800 border-slate-600 text-slate-500" : "bg-muted/30 border-input text-muted-foreground"
        )}>
          ••••••••
        </div>
        <div 
          className="h-8 rounded flex items-center justify-center text-xs font-medium text-white"
          style={{ backgroundColor: primaryColor ? `hsl(${primaryColor})` : 'hsl(var(--primary))' }}
        >
          {t('adminBranding.preview.signInButton')}
        </div>
      </div>
    </div>
  );
}