import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

const SPEECH_LANGS = ['auto', 'ar', 'en', 'ur', 'hi', 'fil'] as const;
type SpeechLang = typeof SPEECH_LANGS[number];

const SPEECH_LANG_LABELS: Record<SpeechLang, string> = {
  auto: 'Auto',
  ar: 'AR',
  en: 'EN',
  ur: 'UR',
  hi: 'HI',
  fil: 'FIL',
};

interface UseSpeechToTextOptions {
  lang?: string;
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  maxDuration?: number;
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    (new () => SpeechRecognitionInstance) | null ?? null;
}

const LANG_MAP: Record<string, string> = {
  en: 'en-US',
  ar: 'ar-SA',
  ur: 'ur-PK',
  hi: 'hi-IN',
  fil: 'fil-PH',
};

export function useSpeechToText({ lang = 'en', onTranscript, onInterim, maxDuration = 120 }: UseSpeechToTextOptions) {
  const [isListening, setIsListening] = useState(false);
  const [speechLang, setSpeechLang] = useState<SpeechLang>(() => {
    const baseLang = lang.split('-')[0];
    return (SPEECH_LANGS.includes(baseLang as SpeechLang) ? baseLang : 'auto') as SpeechLang;
  });
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const shouldRestartRef = useRef(false);
  const isSupported = !!getSpeechRecognition();
  const speechLangRef = useRef(speechLang);

  // Store latest callbacks in refs to avoid stale closures during auto-restart
  const onTranscriptRef = useRef(onTranscript);
  const onInterimRef = useRef(onInterim);
  const langRef = useRef(lang);

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);
  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { speechLangRef.current = speechLang; }, [speechLang]);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const createAndStartRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    // Clean up previous instance
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try { recognitionRef.current.abort(); } catch (_) { /* ignore */ }
    }

    const recognition = new SpeechRecognition();
    const currentSpeechLang = speechLangRef.current;
    
    if (currentSpeechLang !== 'auto') {
      const resolvedLang = LANG_MAP[currentSpeechLang] || currentSpeechLang;
      recognition.lang = resolvedLang;
      console.log('[SpeechToText] Starting session, lang:', resolvedLang);
    } else {
      console.log('[SpeechToText] Starting session, lang: auto (browser default)');
    }
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Show interim text as preview only
      if (interimTranscript && onInterimRef.current) {
        onInterimRef.current(interimTranscript);
      }

      // Only commit final results — prevents repeated/stuttering text
      if (finalTranscript) {
        onTranscriptRef.current(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('[SpeechToText] Error:', event.error);
      // 'no-speech' is normal — just restart to keep listening
      if (event.error === 'no-speech' && shouldRestartRef.current) {
        return; // onend will fire and handle restart
      }
      if (event.error !== 'aborted') {
        shouldRestartRef.current = false;
        clearTimer();
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if user hasn't pressed stop
      if (shouldRestartRef.current) {
        console.log('[SpeechToText] Auto-restarting for next utterance...');
        // Small delay to avoid rapid-fire restarts
        setTimeout(() => {
          if (shouldRestartRef.current) {
            createAndStartRecognition();
          }
        }, 100);
      } else {
        clearTimer();
        setIsListening(false);
        recognitionRef.current = null;
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      console.warn('[SpeechToText] Failed to start:', e);
      shouldRestartRef.current = false;
      setIsListening(false);
    }
  }, [clearTimer]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    clearTimer();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, [clearTimer]);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    // Stop any existing session
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    shouldRestartRef.current = true;
    setIsListening(true);
    createAndStartRecognition();

    // Safety timeout
    timeoutRef.current = window.setTimeout(() => {
      stopListening();
    }, maxDuration * 1000);
  }, [maxDuration, createAndStartRecognition, stopListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      clearTimer();
    };
  }, [clearTimer]);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  };
}
