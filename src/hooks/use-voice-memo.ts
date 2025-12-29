import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VoiceMemoState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
}

export function useVoiceMemo() {
  const [state, setState] = useState<VoiceMemoState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
  });
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        const url = URL.createObjectURL(blob);
        
        setState(prev => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          audioBlob: blob,
          audioUrl: url,
        }));
      };
      
      mediaRecorder.start(1000);
      
      // Start duration timer
      setState(prev => ({ ...prev, isRecording: true, duration: 0 }));
      timerRef.current = window.setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [state.isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, [state.isRecording, state.isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = window.setInterval(() => {
        setState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [state.isPaused]);

  const clearRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
    });
    chunksRef.current = [];
  }, [state.audioUrl]);

  const uploadRecording = useCallback(async (
    bucket: string,
    path: string
  ): Promise<string | null> => {
    if (!state.audioBlob) {
      toast.error('No recording to upload');
      return null;
    }

    try {
      const extension = state.audioBlob.type.includes('webm') ? 'webm' : 'm4a';
      const fileName = `${path}_${Date.now()}.${extension}`;
      
      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, state.audioBlob, {
          contentType: state.audioBlob.type,
          upsert: false
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading recording:', error);
      toast.error('Failed to upload recording');
      return null;
    }
  }, [state.audioBlob]);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    ...state,
    formattedDuration: formatDuration(state.duration),
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    uploadRecording,
  };
}
