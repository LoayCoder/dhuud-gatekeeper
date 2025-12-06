import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Phone,
  MessageSquare,
  Mic,
  Edit,
  Upload,
  Printer,
  FileDown,
  Download,
  Calendar,
  UserCheck,
  FileText,
  Loader2,
  Play,
  Pause,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { WitnessStatement } from "@/hooks/use-witness-statements";
import { generateFilledWitnessPDF } from "@/lib/generate-witness-statement-pdf";
import { useDocumentBranding } from "@/hooks/use-document-branding";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";

interface WitnessDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statement: WitnessStatement | null;
  incident?: {
    reference_id: string | null;
    title: string;
    occurred_at: string | null;
    location: string | null;
  } | null;
}

type StatementType = "document_upload" | "direct_entry" | "voice_recording";

const getStatementTypeIcon = (type: StatementType) => {
  switch (type) {
    case "document_upload":
      return <Upload className="h-4 w-4" />;
    case "direct_entry":
      return <Edit className="h-4 w-4" />;
    case "voice_recording":
      return <Mic className="h-4 w-4" />;
  }
};

const getStatementTypeBadgeVariant = (
  type: StatementType
): "secondary" | "default" | "outline" => {
  switch (type) {
    case "document_upload":
      return "secondary";
    case "direct_entry":
      return "default";
    case "voice_recording":
      return "outline";
  }
};

export function WitnessDetailDialog({
  open,
  onOpenChange,
  statement,
  incident,
}: WitnessDetailDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { tenantName } = useTheme();
  const { settings: documentSettings } = useDocumentBranding();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Fetch creator profile
  const { data: creatorProfile } = useQuery({
    queryKey: ["profile", statement?.created_by],
    queryFn: async () => {
      if (!statement?.created_by) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, job_title")
        .eq("id", statement.created_by)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!statement?.created_by,
  });

  // Fetch attachments
  const { data: attachments } = useQuery({
    queryKey: ["witness-attachments", statement?.id],
    queryFn: async () => {
      if (!statement?.id) return [];
      const { data, error } = await supabase
        .from("witness_attachments")
        .select("id, file_name, file_size, mime_type, storage_path, created_at")
        .eq("statement_id", statement.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!statement?.id,
  });

  const handlePrint = async () => {
    if (!statement || !incident) return;

    setIsGenerating(true);
    try {
      await generateFilledWitnessPDF(
        {
          referenceId: incident.reference_id || "N/A",
          title: incident.title,
          occurredAt: incident.occurred_at,
          location: incident.location,
          tenantName: tenantName || "HSSE Platform",
        },
        {
          witnessName: statement.name,
          witnessContact: statement.contact || undefined,
          relationship: statement.relationship || undefined,
          statement: statement.statement,
          statementType: statement.statement_type,
          createdAt: statement.created_at,
          createdBy: creatorProfile?.full_name || undefined,
          aiAnalysis: statement.ai_analysis,
        },
        { documentSettings }
      );
      toast.success(t("documents.pdfDownloaded", "PDF downloaded successfully"));
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error(t("documents.pdfError", "Failed to generate PDF"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAttachment = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("incident-attachments")
        .download(storagePath);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      toast.error(t("common.downloadError", "Failed to download file"));
    }
  };

  const handlePlayAudio = () => {
    if (!statement?.audio_url) return;

    if (isPlaying && audioElement) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      const audio = new Audio(statement.audio_url);
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setAudioElement(audio);
      setIsPlaying(true);
    }
  };

  if (!statement) return null;

  const aiAnalysis = statement.ai_analysis as Record<string, unknown> | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {statement.name}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 me-2" />
              )}
              {t("investigation.witnesses.printStatement", "Print")}
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={getStatementTypeBadgeVariant(statement.statement_type as StatementType)}>
              {getStatementTypeIcon(statement.statement_type as StatementType)}
              <span className="ms-1">
                {t(`investigation.witnesses.type.${statement.statement_type}`, statement.statement_type)}
              </span>
            </Badge>
            {statement.assignment_status && (
              <Badge variant="outline">
                {t(`investigation.witnesses.status.${statement.assignment_status}`, statement.assignment_status)}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Witness Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {t("investigation.witnesses.witnessInfo", "Witness Information")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {statement.contact && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{statement.contact}</span>
                </div>
              )}
              {statement.relationship && (
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <span>{statement.relationship}</span>
                </div>
              )}
              {statement.created_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(statement.created_at), "PPpp")}</span>
                </div>
              )}
              {creatorProfile && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {t("investigation.witnesses.recordedBy", "Recorded by")}:{" "}
                    {creatorProfile.full_name}
                    {creatorProfile.job_title && ` (${creatorProfile.job_title})`}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statement Content */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t("investigation.witnesses.statement", "Statement")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statement.statement_type === "voice_recording" && statement.audio_url && (
                <div className="mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePlayAudio}
                    className="mb-2"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4 me-2" />
                    ) : (
                      <Play className="h-4 w-4 me-2" />
                    )}
                    {t("investigation.witnesses.playRecording", "Play Recording")}
                  </Button>
                  {statement.original_transcription && statement.transcription_edited && (
                    <div className="text-xs text-muted-foreground mb-2">
                      <span className="font-medium">
                        {t("investigation.witnesses.originalTranscription", "Original Transcription")}:
                      </span>
                      <p className="mt-1 italic">{statement.original_transcription}</p>
                    </div>
                  )}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{statement.statement}</p>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          {aiAnalysis && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("investigation.witnesses.aiAnalysis", "AI Analysis")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {aiAnalysis.summary && (
                  <div>
                    <span className="font-medium text-muted-foreground">
                      {t("investigation.witnesses.aiSummary", "Summary")}:
                    </span>
                    <p className="mt-1">{String(aiAnalysis.summary)}</p>
                  </div>
                )}
                {(aiAnalysis.emotional_cues as { detected?: string[] })?.detected?.length > 0 && (
                  <div>
                    <span className="font-medium text-muted-foreground">
                      {t("investigation.witnesses.emotionalCues", "Emotional Cues")}:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(aiAnalysis.emotional_cues as { detected: string[] }).detected.map(
                        (cue: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {cue}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                )}
                {(aiAnalysis.key_facts as string[])?.length > 0 && (
                  <div>
                    <span className="font-medium text-muted-foreground">
                      {t("investigation.witnesses.keyFacts", "Key Facts")}:
                    </span>
                    <ul className="list-disc list-inside mt-1">
                      {(aiAnalysis.key_facts as string[]).map((fact: string, i: number) => (
                        <li key={i}>{fact}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(aiAnalysis.missing_info as string[])?.length > 0 && (
                  <div>
                    <span className="font-medium text-muted-foreground">
                      {t("investigation.witnesses.missingInfo", "Missing Information")}:
                    </span>
                    <ul className="list-disc list-inside mt-1">
                      {(aiAnalysis.missing_info as string[]).map((info: string, i: number) => (
                        <li key={i}>{info}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {attachments && attachments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t("investigation.witnesses.attachments", "Attachments")} ({attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-2 border rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{attachment.file_name}</p>
                          {attachment.file_size && (
                            <p className="text-xs text-muted-foreground">
                              {(attachment.file_size / 1024).toFixed(1)} KB
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleDownloadAttachment(attachment.storage_path, attachment.file_name)
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {attachments && attachments.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-2">
              {t("investigation.witnesses.noAttachments", "No attachments")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
