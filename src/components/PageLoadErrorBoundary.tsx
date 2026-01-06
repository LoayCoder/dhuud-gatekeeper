import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically for handling page/chunk loading failures.
 * Shows a user-friendly reload option when lazy-loaded pages fail to load.
 */
export class PageLoadErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[PageLoadErrorBoundary] Page loading error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private isChunkLoadError(error: Error | null): boolean {
    if (!error) return false;
    const message = error.message.toLowerCase();
    return (
      message.includes('failed to fetch dynamically imported module') ||
      message.includes('loading chunk') ||
      message.includes('loading css chunk') ||
      message.includes('chunkloaderror')
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const isChunkError = this.isChunkLoadError(this.state.error);

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-6 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-warning/10 mb-4">
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
          
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {isChunkError ? 'Page Update Available' : 'Page Failed to Load'}
          </h2>
          
          <p className="text-muted-foreground mb-6 max-w-md">
            {isChunkError
              ? 'A new version of this page is available. Please reload to get the latest updates.'
              : 'There was a problem loading this page. Please try reloading.'}
          </p>

          <Button onClick={this.handleReload} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
