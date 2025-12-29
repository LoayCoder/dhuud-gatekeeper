import { useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SessionFallbackUIProps {
  error?: Error;
  resetError?: () => void;
}

/**
 * Fallback UI component for when session management completely fails.
 * Shows a dismissible banner allowing users to either reload or continue.
 */
export function SessionFallbackUI({ error, resetError }: SessionFallbackUIProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleReload = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    resetError?.();
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 inset-x-0 z-50 p-4">
      <Alert variant="destructive" className="relative bg-destructive/95 backdrop-blur-sm">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="font-semibold">Session Management Error</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="text-sm mb-3">
            There was an issue with session management. Some features like session timeout 
            and concurrent login detection may not work properly.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReload}
              className="bg-background/10 hover:bg-background/20 border-background/20"
            >
              <RefreshCw className="h-3.5 w-3.5 me-1.5" />
              Reload Page
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="hover:bg-background/10"
            >
              Continue Anyway
            </Button>
          </div>
          {error && process.env.NODE_ENV === 'development' && (
            <details className="mt-3 text-xs opacity-70">
              <summary className="cursor-pointer">Error Details</summary>
              <pre className="mt-1 p-2 bg-background/10 rounded text-[10px] overflow-auto max-h-20">
                {error.message}
              </pre>
            </details>
          )}
        </AlertDescription>
        <button
          onClick={handleDismiss}
          className="absolute top-3 end-3 p-1 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </Alert>
    </div>
  );
}
