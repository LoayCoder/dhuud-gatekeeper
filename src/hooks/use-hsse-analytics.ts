// Re-export from features if available, otherwise stub
// This file exists to satisfy barrel imports from src/hooks/analytics/index.ts

export function useHsseAnalytics() {
  return { data: null, isLoading: false, error: null };
}
