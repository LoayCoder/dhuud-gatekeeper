import { Shield } from 'lucide-react';

interface LoginPreviewProps {
  logoUrl: string | null;
  primaryColor: string;
  tenantName: string;
}

export function LoginPreview({ logoUrl, primaryColor, tenantName }: LoginPreviewProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <div className="p-4 space-y-4">
        {/* Logo/Icon */}
        <div className="flex justify-center">
          <div 
            className="size-12 rounded-xl flex items-center justify-center text-primary-foreground"
            style={{ backgroundColor: primaryColor ? `hsl(${primaryColor})` : 'hsl(var(--primary))' }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="size-8 object-contain" />
            ) : (
              <Shield className="size-6" />
            )}
          </div>
        </div>

        {/* Tenant Name */}
        <div className="text-center">
          <h3 className="font-semibold text-sm">{tenantName || 'Your Company'}</h3>
          <p className="text-xs text-muted-foreground">Sign in to continue</p>
        </div>

        {/* Mock Form */}
        <div className="space-y-3">
          <div className="h-8 bg-muted/50 rounded border text-xs flex items-center px-2 text-muted-foreground">
            Email address
          </div>
          <div className="h-8 bg-muted/50 rounded border text-xs flex items-center px-2 text-muted-foreground">
            Password
          </div>
          <button
            className="w-full h-8 rounded text-xs font-medium text-primary-foreground"
            style={{ backgroundColor: primaryColor ? `hsl(${primaryColor})` : 'hsl(var(--primary))' }}
          >
            Sign In
          </button>
        </div>

        {/* Footer */}
        <div className="text-center pt-2 border-t">
          <span className="text-[10px] text-muted-foreground">
            Protected by Zero Trust Security
          </span>
        </div>
      </div>
    </div>
  );
}
