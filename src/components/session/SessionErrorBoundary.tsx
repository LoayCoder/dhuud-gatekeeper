import React, { Component, ErrorInfo, ReactNode } from 'react';
import { toast } from '@/hooks/use-toast';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * Specialized error boundary for session management errors.
 * Unlike typical error boundaries, this one still renders children
 * to allow the app to continue functioning without session features.
 */
export class SessionErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 30000; // 30 seconds

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging
    console.error('[SessionErrorBoundary] Session management error caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Show toast notification (non-blocking)
    toast({
      title: 'Session Management Issue',
      description: 'Some session features may be temporarily unavailable. The app will continue to work.',
      variant: 'destructive',
      duration: 5000,
    });

    // Schedule auto-retry if under max retries
    if (this.state.retryCount < SessionErrorBoundary.MAX_RETRIES) {
      this.scheduleRetry();
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private scheduleRetry = (): void => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry();
    }, SessionErrorBoundary.RETRY_DELAY_MS);
  };

  private handleRetry = (): void => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  render(): ReactNode {
    // Always render children - session management failure shouldn't block the app
    // The error state is used internally for retry logic
    return this.props.children;
  }
}
