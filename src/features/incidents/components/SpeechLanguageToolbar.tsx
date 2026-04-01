import { Button } from '@/components/ui/button';
import { Mic, MicOff, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { SPEECH_LANG_OPTIONS, type SpeechLang } from '@/hooks/use-speech-to-text';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SpeechLanguageToolbarProps {
  isSupported: boolean;
  isListening: boolean;
  speechLang: SpeechLang;
  setSpeechLang: (lang: SpeechLang) => void;
  toggleListening: () => void;
}

export function SpeechLanguageToolbar({
  isSupported,
  isListening,
  speechLang,
  setSpeechLang,
  toggleListening,
}: SpeechLanguageToolbarProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  if (!isSupported) return null;

  const currentOption = SPEECH_LANG_OPTIONS.find(o => o.value === speechLang);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Select
            value={speechLang}
            onValueChange={(v) => setSpeechLang(v as SpeechLang)}
            dir={direction}
          >
            <SelectTrigger className="h-7 text-xs px-2 py-0 w-auto min-w-[100px] border-muted">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEECH_LANG_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="font-semibold">{opt.shortLabel}</span>
                    <span className="text-muted-foreground">{opt.label}</span>
                    {opt.value === 'auto' && (
                      <span className="text-[10px] text-muted-foreground/60">(β)</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant={isListening ? 'destructive' : 'outline'}
          size="sm"
          className={cn(
            "h-7 gap-1.5 text-xs shrink-0",
            isListening && "animate-pulse"
          )}
          onClick={toggleListening}
        >
          {isListening ? (
            <>
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive-foreground opacity-75" />
                <MicOff className="relative h-3.5 w-3.5" />
              </span>
              {t('speech.stopRecording', 'Stop')}
            </>
          ) : (
            <>
              <Mic className="h-3.5 w-3.5" />
              {t('speech.startRecording', 'Speak')}
            </>
          )}
        </Button>
      </div>

      {/* Status line */}
      {isListening && (
        <p className="text-[11px] text-primary animate-pulse ps-5">
          {t('speech.listeningIn', 'Listening in {{language}}', { language: currentOption?.label })}
        </p>
      )}

      {/* Hint when auto is selected */}
      {speechLang === 'auto' && !isListening && (
        <p className="text-[11px] text-muted-foreground ps-5">
          {t('speech.autoHint', 'For Arabic, select Arabic for best results')}
        </p>
      )}
    </div>
  );
}
