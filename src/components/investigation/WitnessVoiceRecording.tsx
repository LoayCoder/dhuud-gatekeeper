import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Mic, Square, Play, Pause, Check, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCreateWitnessStatement, transcribeAudio, analyzeStatement } from "@/hooks/use-witness-statements";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";


export interface WitnessVoiceRecordingProps {
  incidentId: string;
  incidentContext?: string;
  onSuccess: () => void;
}

const MIN_DURATION = 30; // seconds
const MAX_DURATION = 180; // seconds

export function WitnessVoiceRecording({ 
  incidentId, 
  incidentContext,
  onSuccess
}: WitnessVoiceRecordingProps) {
  const { t } = useTranslation();
  const createStatement = useCreateWitnessStatement();

  const [witnessName, setWitnessName] = useState("");
  const [witnessContact, setWitnessContact] = useState("");
  const [relationship, setRelationship] = useState("");
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [originalTranscription, setOriginalTranscription] = useState("");
  const [isEdited, setIsEdited] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, unknown> | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= MAX_DURATION) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error(t("investigation.witnesses.microphoneError", "Microphone access denied"));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setTranscription("");
    setOriginalTranscription("");
    setIsEdited(false);
    setIsApproved(false);
    setAiAnalysis(null);
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      await new Promise((resolve, reject) => {
        reader.onloadend = resolve;
        reader.onerror = reject;
      });

      const base64 = (reader.result as string).split(",")[1];
      const result = await transcribeAudio(base64, "audio/webm");
      
      setTranscription(result.transcription);
      setOriginalTranscription(result.transcription);
      toast.success(t("investigation.witnesses.transcribeSuccess", "Audio transcribed"));
    } catch (error) {
      console.error("Transcription error:", error);
      toast.error(t("investigation.witnesses.transcribeError", "Transcription failed"));
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!transcription.trim()) return;

    setIsAnalyzing(true);

    try {
      const result = await analyzeStatement(transcription, "full_analysis", incidentContext);
      if (result.analysis) {
        setAiAnalysis(result.analysis);
        toast.success(t("investigation.witnesses.analysisComplete", "Analysis complete"));
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(t("investigation.witnesses.analysisError", "Analysis failed"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTranscriptionChange = (value: string) => {
    setTranscription(value);
    setIsEdited(value !== originalTranscription);
  };

  const handleApprove = () => {
    setIsApproved(true);
    toast.success(t("investigation.witnesses.transcriptionApproved", "Transcription approved"));
  };

  const handleSubmit = async () => {
    if (!witnessName.trim()) {
      toast.error(t("investigation.witnesses.nameRequired", "Witness name is required"));
      return;
    }
    if (!transcription.trim()) {
      toast.error(t("investigation.witnesses.transcriptionRequired", "Transcription is required"));
      return;
    }
    if (!isApproved) {
      toast.error(t("investigation.witnesses.approveFirst", "Please approve the transcription first"));
      return;
    }
    if (!audioBlob) {
      toast.error(t("investigation.witnesses.noAudioError", "No audio recording found"));
      return;
    }

    setIsSubmitting(true);

    try {
      // Get fresh user at execution time to avoid stale closure
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      if (!freshUser?.id) throw new Error("Not authenticated");

      // Get fresh profile for tenant_id
      const { data: freshProfile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', freshUser.id)
        .single();

      if (profileError || !freshProfile?.tenant_id) {
        throw new Error("No tenant ID found");
      }

      // Upload audio file with fresh tenant_id
      const audioPath = `${freshProfile.tenant_id}/witness/${incidentId}/${Date.now()}_recording.webm`;
      const { error: uploadError } = await supabase.storage
        .from("incident-attachments")
        .upload(audioPath, audioBlob);

      if (uploadError) throw uploadError;

      // Create statement
      await createStatement.mutateAsync({
        incident_id: incidentId,
        name: witnessName,
        contact: witnessContact || undefined,
        relationship: relationship || undefined,
        statement: transcription,
        statement_type: "voice_recording",
        audio_url: audioPath,
        original_transcription: originalTranscription,
      });

      onSuccess();
    } catch (error) {
      console.error("Error saving statement:", error);
      toast.error(t("investigation.witnesses.saveError", "Failed to save statement"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = (recordingTime / MAX_DURATION) * 100;
  const isValidDuration = recordingTime >= MIN_DURATION;

  return (
    <div className="space-y-4">
      {/* Witness Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="witnessName">{t("investigation.witnesses.name", "Witness Name")} *</Label>
          <Input
            id="witnessName"
            value={witnessName}
            onChange={(e) => setWitnessName(e.target.value)}
            placeholder={t("investigation.witnesses.namePlaceholder", "Enter witness name...")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="witnessContact">{t("investigation.witnesses.contact", "Contact Info")}</Label>
          <Input
            id="witnessContact"
            value={witnessContact}
            onChange={(e) => setWitnessContact(e.target.value)}
            placeholder={t("investigation.witnesses.contactPlaceholder", "Phone or email...")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="relationship">{t("investigation.witnesses.relationship", "Relationship")}</Label>
        <Input
          id="relationship"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          placeholder={t("investigation.witnesses.relationshipPlaceholder", "e.g., Colleague, Supervisor...")}
        />
      </div>

      {/* Recording Controls */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              {t("investigation.witnesses.voiceRecording", "Voice Recording")}
            </span>
            <Badge variant={isRecording ? "destructive" : "secondary"}>
              {formatTime(recordingTime)} / {formatTime(MAX_DURATION)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressPercent} className="h-2" />
          
          <p className="text-xs text-muted-foreground text-center">
            {t("investigation.witnesses.recordingLimit", "Recording: {{min}}-{{max}} seconds", { min: MIN_DURATION, max: MAX_DURATION })}
          </p>

          <div className="flex justify-center gap-2">
            {!audioBlob ? (
              <>
                {!isRecording ? (
                  <Button onClick={startRecording} variant="destructive">
                    <Mic className="me-2 h-4 w-4" />
                    {t("investigation.witnesses.startRecording", "Start Recording")}
                  </Button>
                ) : (
                  <>
                    <Button onClick={pauseRecording} variant="outline">
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </Button>
                    <Button 
                      onClick={stopRecording} 
                      variant="destructive"
                      disabled={!isValidDuration}
                    >
                      <Square className="me-2 h-4 w-4" />
                      {t("investigation.witnesses.stopRecording", "Stop Recording")}
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <audio src={audioUrl!} controls className="w-full max-w-md" />
                <Button onClick={resetRecording} variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {audioBlob && !transcription && (
            <div className="flex justify-center">
              <Button onClick={handleTranscribe} disabled={isTranscribing}>
                {isTranscribing ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="me-2 h-4 w-4" />
                )}
                {t("investigation.witnesses.transcribe", "Transcribe Audio")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcription */}
      {transcription && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t("investigation.witnesses.transcription", "Transcription")}</Label>
            <div className="flex gap-2">
              {isEdited && (
                <Badge variant="outline" className="text-amber-500">
                  {t("investigation.witnesses.edited", "Edited")}
                </Badge>
              )}
              {isApproved && (
                <Badge variant="outline" className="text-green-600">
                  <Check className="me-1 h-3 w-3" />
                  {t("investigation.witnesses.approved", "Approved")}
                </Badge>
              )}
            </div>
          </div>
          <Textarea
            value={transcription}
            onChange={(e) => handleTranscriptionChange(e.target.value)}
            rows={6}
            disabled={isApproved}
          />
          
          <div className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !transcription.trim()}
            >
              {isAnalyzing ? (
                <Loader2 className="me-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="me-1 h-3 w-3" />
              )}
              {t("investigation.witnesses.analyzeStatement", "Analyze")}
            </Button>
            
            {!isApproved && (
              <Button onClick={handleApprove} variant="default">
                <Check className="me-2 h-4 w-4" />
                {t("investigation.witnesses.approveTranscription", "Approve Transcription")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* AI Analysis Results */}
      {aiAnalysis && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("investigation.witnesses.aiAnalysisResults", "AI Analysis")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(aiAnalysis as Record<string, unknown>).emotionalCues && (
              <div>
                <p className="font-medium">{t("investigation.witnesses.emotionalCues", "Emotional Cues")}:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {((aiAnalysis as Record<string, { detected?: string[] }>).emotionalCues?.detected || []).map((cue: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{cue}</Badge>
                  ))}
                </div>
              </div>
            )}
            {(aiAnalysis as Record<string, unknown>).summary && (
              <div>
                <p className="font-medium">{t("investigation.witnesses.aiSummary", "Summary")}:</p>
                <p className="text-muted-foreground">{String((aiAnalysis as Record<string, unknown>).summary)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !witnessName.trim() || !transcription.trim() || !isApproved}
        >
          {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {t("investigation.witnesses.saveStatement", "Save Statement")}
        </Button>
      </div>
    </div>
  );
}
