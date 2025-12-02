import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarPreviewProps {
  sidebarIconUrl: string | null;
  primaryColor: string;
  tenantName: string;
  isDark?: boolean;
}

export function SidebarPreview({ sidebarIconUrl, primaryColor, tenantName, isDark = false }: SidebarPreviewProps) {
  return (
    <div className={cn(
      "border rounded-lg p-4 transition-colors",
      isDark ? "bg-slate-900 border-slate-700" : "bg-sidebar"
    )}>
      <div className="flex items-center gap-3">
        <div 
          className="size-10 rounded-lg flex items-center justify-center text-primary-foreground"
          style={{ backgroundColor: primaryColor ? `hsl(${primaryColor})` : 'hsl(var(--primary))' }}
        >
          {sidebarIconUrl ? (
            <img src={sidebarIconUrl} alt="Icon" className="size-7 object-contain" />
          ) : (
            <Shield className="size-5" />
          )}
        </div>
        <div className="text-left leading-tight">
          <span className={cn(
            "font-semibold text-sm block truncate max-w-[140px]",
            isDark ? "text-white" : "text-sidebar-foreground"
          )}>
            {tenantName || 'Your Company'}
          </span>
          <span className={cn(
            "text-xs",
            isDark ? "text-slate-400" : "text-muted-foreground"
          )}>
            Enterprise HSSE
          </span>
        </div>
      </div>
    </div>
  );
}
