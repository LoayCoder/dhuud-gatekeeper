import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isOffline: boolean;
}

/**
 * Global Error Boundary component that catches JavaScript errors anywhere in the child component tree.
 * Provides a user-friendly fallback UI with recovery options.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isOffline: !navigator.onLine,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error to console in development
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    
    // In production, you could send this to an error reporting service
    // logErrorToService(error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  handleOnline = () => {
    this.setState({ isOffline: false });
    // If error was likely due to network, try recovering
    if (this.state.hasError) {
      this.handleReset();
    }
  };

  handleOffline = () => {
    this.setState({ isOffline: true });
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, isOffline } = this.state;

      return (
        <div 
          className="min-h-screen flex items-center justify-center p-4 bg-background"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md w-full text-center space-y-6">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              {isOffline ? (
                <WifiOff className="w-8 h-8 text-destructive" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-destructive" />
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-semibold text-foreground">
              {isOffline ? 'You\'re Offline' : 'Something went wrong'}
            </h1>

            {/* Description */}
            <p className="text-muted-foreground">
              {isOffline
                ? 'Please check your internet connection and try again.'
                : 'An unexpected error occurred. We apologize for the inconvenience.'}
            </p>

            {/* Error details (dev only or expandable) */}
            {error && process.env.NODE_ENV === 'development' && (
              <details className="text-start bg-muted/50 rounded-lg p-4 text-sm">
                <summary className="cursor-pointer font-medium text-foreground">
                  Error Details
                </summary>
                <pre className="mt-2 text-xs text-muted-foreground overflow-auto max-h-40">
                  {error.message}
                  {'\n\n'}
                  {error.stack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="default"
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                Go to Home
              </Button>
            </div>

            {/* Offline indicator */}
            {isOffline && (
              <p className="text-sm text-muted-foreground animate-pulse">
                Waiting for connection...
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap any component with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
