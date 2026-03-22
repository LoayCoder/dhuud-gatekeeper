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

export const SPEECH_LANG_OPTIONS = [
  { value: 'ar', label: 'العربية', shortLabel: 'AR' },
  { value: 'en', label: 'English', shortLabel: 'EN' },
  { value: 'ur', label: 'اردو', shortLabel: 'UR' },
  { value: 'hi', label: 'हिन्दी', shortLabel: 'HI' },
  { value: 'fil', label: 'Filipino', shortLabel: 'FIL' },
  { value: 'auto', label: 'Auto-detect', shortLabel: 'Auto' },
] as const;

export type SpeechLang = typeof SPEECH_LANG_OPTIONS[number]['value'];

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
  const [speechLang, setSpeechLangState] = useState<SpeechLang>(() => {
    const baseLang = lang.split('-')[0];
    const valid = SPEECH_LANG_OPTIONS.some(o => o.value === baseLang);
    return (valid ? baseLang : 'ar') as SpeechLang;
  });
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const shouldRestartRef = useRef(false);
  const isSupported = !!getSpeechRecognition();
  const speechLangRef = useRef(speechLang);

  const onTranscriptRef = useRef(onTranscript);
  const onInterimRef = useRef(onInterim);

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);
  useEffect(() => { speechLangRef.current = speechLang; }, [speechLang]);

  const setSpeechLang = useCallback((value: SpeechLang) => {
    setSpeechLangState(value);
  }, []);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const createAndStartRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

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

      if (interimTranscript && onInterimRef.current) {
        onInterimRef.current(interimTranscript);
      }

      if (finalTranscript) {
        onTranscriptRef.current(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('[SpeechToText] Error:', event.error);
      if (event.error === 'no-speech' && shouldRestartRef.current) {
        return;
      }
      if (event.error !== 'aborted') {
        shouldRestartRef.current = false;
        clearTimer();
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        console.log('[SpeechToText] Auto-restarting for next utterance...');
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

    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }

    shouldRestartRef.current = true;
    setIsListening(true);
    createAndStartRecognition();

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

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      clearTimer();
    };
  }, [clearTimer]);

  const currentOption = SPEECH_LANG_OPTIONS.find(o => o.value === speechLang) || SPEECH_LANG_OPTIONS[0];

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    speechLang,
    setSpeechLang,
    speechLangLabel: currentOption.shortLabel,
    speechLangFullLabel: currentOption.label,
  };
}
