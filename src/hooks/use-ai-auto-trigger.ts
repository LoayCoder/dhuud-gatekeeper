import { useState, useEffect, useRef, useCallback } from 'react';

interface IncidentContext {
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- stub interface consumed by incident report components expecting full AI analysis shape
interface AIValidatorReturn {
  validateIncident: (ctx: IncidentContext) => Promise<{ isValid: boolean; suggestions: unknown[] }>;
  isValidating: boolean;
  isAnalyzing: boolean;
  analysisResult: any;
  analyzeIncident: (...args: unknown[]) => void;
  validationState: string;
  [key: string]: any;
}

// Stub until real hook is available
const useIncidentAIValidator = (): AIValidatorReturn => ({
  validateIncident: async () => ({ isValid: true, suggestions: [] }),
  isValidating: false,
  isAnalyzing: false,
  analysisResult: null,
  analyzeIncident: () => { /* noop */ },
  validationState: 'idle',
});

interface UseAIAutoTriggerOptions {
  minCharacters?: number;
  debounceDelay?: number;
  enabled?: boolean;
  onAnalysisComplete?: () => void;
  context?: IncidentContext;
}

interface UseAIAutoTriggerReturn {
  isAutoTriggerEnabled: boolean;
  setAutoTriggerEnabled: (enabled: boolean) => void;
  isPendingAutoTrigger: boolean;
  triggerAnalysis: () => void;
  cancelPendingTrigger: () => void;
  validator: AIValidatorReturn;
  lastAnalyzedHash: string | null;
}

const LOCAL_STORAGE_KEY = 'ai-auto-trigger-enabled';

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

  const [isAutoTriggerEnabled, setAutoTriggerEnabledState] = useState(() => {
    if (typeof window === 'undefined') return enabled;
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored !== null ? stored === 'true' : enabled;
  });

  const [isPendingAutoTrigger, setIsPendingAutoTrigger] = useState(false);
  const [lastAnalyzedHash, setLastAnalyzedHash] = useState<string | null>(null);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const validator = useIncidentAIValidator();

  const createContentHash = useCallback((t: string, d: string) => {
    return `${t.trim().toLowerCase()}|${d.trim().toLowerCase()}`;
  }, []);

  const setAutoTriggerEnabled = useCallback((val: boolean) => {
    setAutoTriggerEnabledState(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, String(val));
    }
  }, []);

  const cancelPendingTrigger = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    setIsPendingAutoTrigger(false);
  }, []);

  const triggerAnalysis = useCallback(() => {
    cancelPendingTrigger();
    if (description.trim().length < minCharacters) return;

    const currentHash = createContentHash(title, description);
    if (currentHash === lastAnalyzedHash && validator.analysisResult) return;

    setLastAnalyzedHash(currentHash);
    validator.analyzeIncident(title, description, context);
  }, [title, description, minCharacters, context, validator, lastAnalyzedHash, createContentHash, cancelPendingTrigger]);

  useEffect(() => {
    if (!isAutoTriggerEnabled) { cancelPendingTrigger(); return; }
    if (validator.isAnalyzing) return;
    if (description.trim().length < minCharacters) { cancelPendingTrigger(); return; }

    const currentHash = createContentHash(title, description);
    if (currentHash === lastAnalyzedHash && validator.analysisResult) { cancelPendingTrigger(); return; }

    setIsPendingAutoTrigger(true);
    debounceTimeoutRef.current = setTimeout(() => {
      setIsPendingAutoTrigger(false);
      setLastAnalyzedHash(currentHash);
      validator.analyzeIncident(title, description, context);
    }, debounceDelay);

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [
    title, description, isAutoTriggerEnabled, minCharacters, debounceDelay,
    context, validator.isAnalyzing, validator.analysisResult,
    lastAnalyzedHash, createContentHash, cancelPendingTrigger,
  ]);

  useEffect(() => {
    if (validator.validationState === 'analysis_ready' || validator.validationState === 'awaiting_translation_confirm') {
      onAnalysisComplete?.();
    }
  }, [validator.validationState, onAnalysisComplete]);

  useEffect(() => {
    return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
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
