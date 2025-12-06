import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, RefreshCw, FileText, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCreateWitnessStatement, useUpdateWitnessStatement, analyzeStatement } from "@/hooks/use-witness-statements";
import { toast } from "sonner";

interface WitnessDirectEntryProps {
  incidentId: string;
  incidentContext?: string;
  existingStatement?: {
    id: string;
    witness_name: string;
    witness_contact: string | null;
    relationship: string | null;
    statement_text: string | null;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function WitnessDirectEntry({ 
  incidentId, 
  incidentContext,
  existingStatement,
  onSuccess, 
  onCancel 
}: WitnessDirectEntryProps) {
  const { t } = useTranslation();
  const createStatement = useCreateWitnessStatement();
  const updateStatement = useUpdateWitnessStatement();

  const [witnessName, setWitnessName] = useState(existingStatement?.witness_name || "");
  const [witnessContact, setWitnessContact] = useState(existingStatement?.witness_contact || "");
  const [relationship, setRelationship] = useState(existingStatement?.relationship || "");
  const [statementText, setStatementText] = useState(existingStatement?.statement_text || "");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisType, setAnalysisType] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [missingDetails, setMissingDetails] = useState<string | null>(null);

  const handleAIAction = async (type: "rewrite" | "summarize" | "detect_missing") => {
    if (!statementText.trim()) {
      toast.error(t("investigation.witnesses.statementRequired"));
      return;
    }

    setIsAnalyzing(true);
    setAnalysisType(type);

    try {
      const result = await analyzeStatement(statementText, type, incidentContext);
      
      if (type === "rewrite") {
        setStatementText(result.result || statementText);
        toast.success(t("investigation.witnesses.rewriteSuccess"));
      } else if (type === "summarize") {
        setAnalysisResult(result.result || null);
        toast.success(t("investigation.witnesses.summarizeSuccess"));
      } else if (type === "detect_missing") {
        setMissingDetails(result.result || null);
        toast.success(t("investigation.witnesses.detectSuccess"));
      }
    } catch (error) {
      console.error("AI analysis error:", error);
      toast.error(t("investigation.witnesses.analysisError"));
    } finally {
      setIsAnalyzing(false);
      setAnalysisType(null);
    }
  };

  const handleSubmit = async () => {
    if (!witnessName.trim()) {
      toast.error(t("investigation.witnesses.nameRequired"));
      return;
    }
    if (!statementText.trim()) {
      toast.error(t("investigation.witnesses.statementRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      if (existingStatement) {
        await updateStatement.mutateAsync({
          id: existingStatement.id,
          witness_name: witnessName,
          witness_contact: witnessContact || undefined,
          relationship: relationship || undefined,
          statement_text: statementText,
          assignment_status: "completed",
        });
      } else {
        await createStatement.mutateAsync({
          incident_id: incidentId,
          witness_name: witnessName,
          witness_contact: witnessContact || undefined,
          relationship: relationship || undefined,
          statement_text: statementText,
          statement_type: "direct_entry",
        });
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving statement:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="witnessName">{t("investigation.witnesses.name")} *</Label>
          <Input
            id="witnessName"
            value={witnessName}
            onChange={(e) => setWitnessName(e.target.value)}
            placeholder={t("investigation.witnesses.namePlaceholder")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="witnessContact">{t("investigation.witnesses.contact")}</Label>
          <Input
            id="witnessContact"
            value={witnessContact}
            onChange={(e) => setWitnessContact(e.target.value)}
            placeholder={t("investigation.witnesses.contactPlaceholder")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="relationship">{t("investigation.witnesses.relationship")}</Label>
        <Input
          id="relationship"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          placeholder={t("investigation.witnesses.relationshipPlaceholder")}
        />
      </div>

      {/* Statement Text */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="statementText">{t("investigation.witnesses.statementText")} *</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAIAction("rewrite")}
              disabled={isAnalyzing || !statementText.trim()}
            >
              {isAnalyzing && analysisType === "rewrite" ? (
                <Loader2 className="me-1 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="me-1 h-3 w-3" />
              )}
              {t("investigation.witnesses.aiRewrite")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAIAction("summarize")}
              disabled={isAnalyzing || !statementText.trim()}
            >
              {isAnalyzing && analysisType === "summarize" ? (
                <Loader2 className="me-1 h-3 w-3 animate-spin" />
              ) : (
                <FileText className="me-1 h-3 w-3" />
              )}
              {t("investigation.witnesses.aiSummarize")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAIAction("detect_missing")}
              disabled={isAnalyzing || !statementText.trim()}
            >
              {isAnalyzing && analysisType === "detect_missing" ? (
                <Loader2 className="me-1 h-3 w-3 animate-spin" />
              ) : (
                <AlertCircle className="me-1 h-3 w-3" />
              )}
              {t("investigation.witnesses.aiDetectMissing")}
            </Button>
          </div>
        </div>
        <Textarea
          id="statementText"
          value={statementText}
          onChange={(e) => setStatementText(e.target.value)}
          placeholder={t("investigation.witnesses.statementPlaceholder")}
          rows={8}
          className="min-h-[200px]"
        />
      </div>

      {/* AI Summary Result */}
      {analysisResult && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("investigation.witnesses.aiSummary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <p className="text-sm whitespace-pre-wrap">{analysisResult}</p>
          </CardContent>
        </Card>
      )}

      {/* Missing Details Result */}
      {missingDetails && (
        <Card className="border-warning/20 bg-warning/5">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              {t("investigation.witnesses.missingDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <p className="text-sm whitespace-pre-wrap">{missingDetails}</p>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          {t("common.cancel")}
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !witnessName.trim() || !statementText.trim()}
        >
          {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {existingStatement 
            ? t("investigation.witnesses.submitStatement") 
            : t("investigation.witnesses.saveStatement")}
        </Button>
      </div>
    </div>
  );
}
