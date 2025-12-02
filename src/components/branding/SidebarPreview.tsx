import { Shield } from 'lucide-react';

interface SidebarPreviewProps {
  logoUrl: string | null;
  primaryColor: string;
  tenantName: string;
}

export function SidebarPreview({ logoUrl, primaryColor, tenantName }: SidebarPreviewProps) {
  return (
    <div className="border rounded-lg p-4 bg-sidebar">
      <div className="flex items-center gap-3">
        <div 
          className="size-10 rounded-lg flex items-center justify-center text-primary-foreground"
          style={{ backgroundColor: primaryColor ? `hsl(${primaryColor})` : 'hsl(var(--primary))' }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="size-7 object-contain" />
          ) : (
            <Shield className="size-5" />
          )}
        </div>
        <div className="text-left leading-tight">
          <span className="font-semibold text-sm block truncate max-w-[140px]">
            {tenantName || 'Your Company'}
          </span>
          <span className="text-xs text-muted-foreground">Enterprise HSSE</span>
        </div>
      </div>
    </div>
  );
}
