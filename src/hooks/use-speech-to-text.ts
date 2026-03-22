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

interface UseSpeechToTextOptions {
  lang?: string;
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  maxDuration?: number; // seconds, default 60
}

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    (new () => SpeechRecognitionInstance) | null ?? null;
}

// Map i18n language codes to BCP-47 for speech recognition
const LANG_MAP: Record<string, string> = {
  en: 'en-US',
  ar: 'ar-SA',
  ur: 'ur-PK',
  hi: 'hi-IN',
  fil: 'fil-PH',
};

export function useSpeechToText({ lang = 'en', onTranscript, onInterim, maxDuration = 60 }: UseSpeechToTextOptions) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const isSupported = !!getSpeechRecognition();

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    cleanup();
  }, [cleanup]);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    // Stop any existing session
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      cleanup();
    }

    const recognition = new SpeechRecognition();
    const baseLang = lang.split('-')[0];
    recognition.lang = LANG_MAP[baseLang] || lang;
    recognition.continuous = true;
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

      if (interimTranscript && onInterim) {
        onInterim(interimTranscript);
      }

      if (finalTranscript) {
        onTranscript(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('[SpeechToText] Error:', event.error);
      if (event.error !== 'aborted') {
        cleanup();
      }
    };

    recognition.onend = () => {
      cleanup();
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);

    // Safety timeout
    timeoutRef.current = window.setTimeout(() => {
      stopListening();
    }, maxDuration * 1000);
  }, [lang, onTranscript, onInterim, maxDuration, cleanup, stopListening]);

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
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      cleanup();
    };
  }, [cleanup]);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  };
}
