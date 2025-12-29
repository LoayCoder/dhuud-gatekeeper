import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Square, Pause, Play, Trash2, Upload } from 'lucide-react';
import { useVoiceMemo } from '@/hooks/use-voice-memo';
import { cn } from '@/lib/utils';

interface VoiceMemoRecorderProps {
  onRecordingComplete?: (blob: Blob | null, url: string | null) => void;
  onUpload?: (publicUrl: string) => void;
  bucket?: string;
  uploadPath?: string;
  className?: string;
  compact?: boolean;
}

export function VoiceMemoRecorder({
  onRecordingComplete,
  onUpload,
  bucket,
  uploadPath,
  className,
  compact = false,
}: VoiceMemoRecorderProps) {
  const { t } = useTranslation();
  const {
    isRecording,
    isPaused,
    audioBlob,
    audioUrl,
    formattedDuration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    uploadRecording,
  } = useVoiceMemo();

  const handleStop = () => {
    stopRecording();
    // Notify parent after state updates
    setTimeout(() => {
      if (onRecordingComplete) {
        onRecordingComplete(audioBlob, audioUrl);
      }
    }, 100);
  };

  const handleUpload = async () => {
    if (bucket && uploadPath && audioBlob) {
      const publicUrl = await uploadRecording(bucket, uploadPath);
      if (publicUrl && onUpload) {
        onUpload(publicUrl);
        clearRecording();
      }
    }
  };

  const handleClear = () => {
    clearRecording();
    if (onRecordingComplete) {
      onRecordingComplete(null, null);
    }
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {!isRecording && !audioUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startRecording}
            className="gap-2"
          >
            <Mic className="h-4 w-4" />
            {t('security.voiceMemo.record', 'Record')}
          </Button>
        )}
        
        {isRecording && (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive rounded-md animate-pulse">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <span className="text-sm font-mono">{formattedDuration}</span>
            </div>
            {isPaused ? (
              <Button type="button" variant="ghost" size="icon" onClick={resumeRecording}>
                <Play className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="icon" onClick={pauseRecording}>
                <Pause className="h-4 w-4" />
              </Button>
            )}
            <Button type="button" variant="destructive" size="icon" onClick={handleStop}>
              <Square className="h-4 w-4" />
            </Button>
          </>
        )}
        
        {audioUrl && !isRecording && (
          <>
            <audio src={audioUrl} controls className="h-8 max-w-[200px]" />
            <Button type="button" variant="ghost" size="icon" onClick={handleClear}>
              <Trash2 className="h-4 w-4" />
            </Button>
            {bucket && uploadPath && (
              <Button type="button" variant="outline" size="icon" onClick={handleUpload}>
                <Upload className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="pt-4">
        <div className="flex flex-col items-center gap-4">
          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-3 px-4 py-2 bg-destructive/10 text-destructive rounded-full animate-pulse">
              <div className="h-3 w-3 rounded-full bg-destructive" />
              <span className="text-lg font-mono font-medium">{formattedDuration}</span>
              {isPaused && (
                <span className="text-sm">({t('security.voiceMemo.paused', 'Paused')})</span>
              )}
            </div>
          )}

          {/* Audio playback */}
          {audioUrl && !isRecording && (
            <div className="w-full">
              <audio src={audioUrl} controls className="w-full" />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3">
            {!isRecording && !audioUrl && (
              <Button
                type="button"
                size="lg"
                onClick={startRecording}
                className="gap-2 min-w-[140px]"
              >
                <Mic className="h-5 w-5" />
                {t('security.voiceMemo.startRecording', 'Start Recording')}
              </Button>
            )}

            {isRecording && (
              <>
                {isPaused ? (
                  <Button type="button" variant="outline" size="lg" onClick={resumeRecording} className="gap-2">
                    <Play className="h-5 w-5" />
                    {t('security.voiceMemo.resume', 'Resume')}
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="lg" onClick={pauseRecording} className="gap-2">
                    <Pause className="h-5 w-5" />
                    {t('security.voiceMemo.pause', 'Pause')}
                  </Button>
                )}
                <Button type="button" variant="destructive" size="lg" onClick={handleStop} className="gap-2">
                  <Square className="h-5 w-5" />
                  {t('security.voiceMemo.stop', 'Stop')}
                </Button>
              </>
            )}

            {audioUrl && !isRecording && (
              <>
                <Button type="button" variant="outline" size="lg" onClick={handleClear} className="gap-2">
                  <Trash2 className="h-5 w-5" />
                  {t('security.voiceMemo.delete', 'Delete')}
                </Button>
                {bucket && uploadPath && (
                  <Button type="button" size="lg" onClick={handleUpload} className="gap-2">
                    <Upload className="h-5 w-5" />
                    {t('security.voiceMemo.upload', 'Upload')}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
