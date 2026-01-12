import { useOnlineRetry } from '@/hooks/use-online-retry';

/**
 * Component that handles automatic retry of failed queries when coming back online.
 * Must be rendered inside QueryClientProvider.
 */
export function OnlineRetryHandler() {
  useOnlineRetry();
  return null;
}
