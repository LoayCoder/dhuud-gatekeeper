import { useState, useEffect, useRef, useCallback } from 'react';
import { useIncidentAIValidator, IncidentContext } from './use-incident-ai-validator';

interface UseAIAutoTriggerOptions {
  /** Minimum character count before triggering AI analysis */
  minCharacters?: number;
  /** Debounce delay in milliseconds after user stops typing */
  debounceDelay?: number;
  /** Whether auto-trigger is enabled */
  enabled?: boolean;
  /** Callback when auto-analysis completes */
  onAnalysisComplete?: () => void;
  /** Context for the incident (location, asset, etc.) */
  context?: IncidentContext;
}

interface UseAIAutoTriggerReturn {
  /** Whether auto-trigger is currently enabled */
  isAutoTriggerEnabled: boolean;
  /** Toggle auto-trigger on/off */
  setAutoTriggerEnabled: (enabled: boolean) => void;
  /** Whether an auto-triggered analysis is pending (waiting for debounce) */
  isPendingAutoTrigger: boolean;
  /** Manually trigger analysis (bypasses debounce) */
  triggerAnalysis: () => void;
  /** Cancel any pending auto-trigger */
  cancelPendingTrigger: () => void;
  /** The underlying AI validator hook return values */
  validator: ReturnType<typeof useIncidentAIValidator>;
  /** Hash of last analyzed content (to prevent duplicate analyses) */
  lastAnalyzedHash: string | null;
}

const LOCAL_STORAGE_KEY = 'ai-auto-trigger-enabled';

/**
 * Hook for auto-triggering AI analysis when description changes
 *
 * Implements debounced auto-trigger when:
 * 1. Auto-trigger is enabled
 * 2. Description meets minimum character threshold
 * 3. User stops typing for the debounce period
 * 4. Content has changed since last analysis
 */
export function useAIAutoTrigger(
  title: string,
  description: string,
  options: UseAIAutoTriggerOptions = {}
): UseAIAutoTriggerReturn {
  const {
    minCharacters = 20,
    debounceDelay = 2000,
    enabled = true,
    onAnalysisComplete,
    context,
  } = options;

  // Load initial preference from localStorage
  const [isAutoTriggerEnabled, setAutoTriggerEnabledState] = useState(() => {
    if (typeof window === 'undefined') return enabled;
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored !== null ? stored === 'true' : enabled;
  });

  const [isPendingAutoTrigger, setIsPendingAutoTrigger] = useState(false);
  const [lastAnalyzedHash, setLastAnalyzedHash] = useState<string | null>(null);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const validator = useIncidentAIValidator();

  // Create a hash of the content to detect changes
  const createContentHash = useCallback((t: string, d: string) => {
    return `${t.trim().toLowerCase()}|${d.trim().toLowerCase()}`;
  }, []);

  // Persist auto-trigger preference
  const setAutoTriggerEnabled = useCallback((enabled: boolean) => {
    setAutoTriggerEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, String(enabled));
    }
  }, []);

  // Cancel any pending trigger
  const cancelPendingTrigger = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    setIsPendingAutoTrigger(false);
  }, []);

  // Manually trigger analysis
  const triggerAnalysis = useCallback(() => {
    cancelPendingTrigger();

    if (description.trim().length < minCharacters) {
      return;
    }

    const currentHash = createContentHash(title, description);

    // Don't re-analyze if content hasn't changed
    if (currentHash === lastAnalyzedHash && validator.analysisResult) {
      return;
    }

    setLastAnalyzedHash(currentHash);
    validator.analyzeIncident(title, description, context);
  }, [title, description, minCharacters, context, validator, lastAnalyzedHash, createContentHash, cancelPendingTrigger]);

  // Auto-trigger effect with debouncing
  useEffect(() => {
    // Skip if auto-trigger is disabled
    if (!isAutoTriggerEnabled) {
      cancelPendingTrigger();
      return;
    }

    // Skip if already analyzing
    if (validator.isAnalyzing) {
      return;
    }

    // Skip if description is too short
    if (description.trim().length < minCharacters) {
      cancelPendingTrigger();
      return;
    }

    const currentHash = createContentHash(title, description);

    // Skip if content hasn't changed since last analysis
    if (currentHash === lastAnalyzedHash && validator.analysisResult) {
      cancelPendingTrigger();
      return;
    }

    // Set up debounced trigger
    setIsPendingAutoTrigger(true);

    debounceTimeoutRef.current = setTimeout(() => {
      setIsPendingAutoTrigger(false);
      setLastAnalyzedHash(currentHash);
      validator.analyzeIncident(title, description, context);
    }, debounceDelay);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [
    title,
    description,
    isAutoTriggerEnabled,
    minCharacters,
    debounceDelay,
    context,
    validator.isAnalyzing,
    validator.analysisResult,
    lastAnalyzedHash,
    createContentHash,
    cancelPendingTrigger,
  ]);

  // Call onAnalysisComplete when analysis finishes
  useEffect(() => {
    if (validator.validationState === 'analysis_ready' || validator.validationState === 'awaiting_translation_confirm') {
      onAnalysisComplete?.();
    }
  }, [validator.validationState, onAnalysisComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    isAutoTriggerEnabled,
    setAutoTriggerEnabled,
    isPendingAutoTrigger,
    triggerAnalysis,
    cancelPendingTrigger,
    validator,
    lastAnalyzedHash,
  };
}
