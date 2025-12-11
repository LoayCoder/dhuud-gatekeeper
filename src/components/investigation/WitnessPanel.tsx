import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, User, Phone, MessageSquare, Mic, Edit, Upload, FileDown, Printer, ChevronRight, Lock } from "lucide-react";
import { format } from "date-fns";
import { useWitnessStatements, WitnessStatement } from "@/hooks/use-witness-statements";
import { WitnessDocumentUpload } from "./WitnessDocumentUpload";
import { WitnessDirectEntry } from "./WitnessDirectEntry";
import { WitnessVoiceRecording } from "./WitnessVoiceRecording";
import { WitnessTaskAssignment } from "./WitnessTaskAssignment";
import { WitnessDetailDialog } from "./WitnessDetailDialog";
import { generateWitnessWordDoc, WitnessFormData } from "@/lib/generate-witness-word-doc";
import { useTheme } from "@/contexts/ThemeContext";
import { useDocumentBranding } from "@/hooks/use-document-branding";
import { toast } from "sonner";

interface WitnessPanelProps {
  incidentId: string;
  incident?: {
    reference_id: string | null;
    title: string;
    occurred_at: string | null;
    location: string | null;
    branches?: { name: string } | null;
    sites?: { name: string } | null;
  } | null;
  incidentStatus?: string | null;
  canEdit?: boolean;
}

type StatementType = 'document_upload' | 'direct_entry' | 'voice_recording';

const getStatementTypeIcon = (type: StatementType) => {
  switch (type) {
    case 'document_upload': return <Upload className="h-4 w-4" />;
    case 'direct_entry': return <Edit className="h-4 w-4" />;
    case 'voice_recording': return <Mic className="h-4 w-4" />;
  }
};

const getStatementTypeBadgeVariant = (type: StatementType): "secondary" | "default" | "outline" => {
  switch (type) {
    case 'document_upload': return 'secondary';
    case 'direct_entry': return 'default';
    case 'voice_recording': return 'outline';
  }
};

export function WitnessPanel({ incidentId, incident, incidentStatus, canEdit: canEditProp }: WitnessPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { tenantName } = useTheme();
  const { settings: documentSettings } = useDocumentBranding();
  const [activeTab, setActiveTab] = useState<string>("list");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<WitnessStatement | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { statements, isLoading, refetch } = useWitnessStatements(incidentId);
  
  // Read-only mode when incident is closed OR canEdit prop is explicitly false
  const isLocked = incidentStatus === 'closed' || canEditProp === false;

  const handleStatementAdded = () => {
    refetch();
    setActiveTab("list");
  };

  const handleDownloadForm = async () => {
    if (!incident) {
      toast.error(t('investigation.witnesses.noIncidentData', 'Incident data not available'));
      return;
    }

    setIsGenerating(true);
    try {
      const formData: WitnessFormData = {
        referenceId: incident.reference_id || 'N/A',
        title: incident.title,
        occurredAt: incident.occurred_at,
        location: incident.location,
        branchName: incident.branches?.name,
        siteName: incident.sites?.name,
        tenantName: tenantName || 'HSSE Platform',
      };

      await generateWitnessWordDoc(formData, { documentSettings });
      toast.success(t('investigation.witnesses.formDownloaded', 'Form downloaded successfully'));
    } catch (error) {
      console.error('Error generating witness form:', error);
      toast.error(t('investigation.witnesses.formError', 'Failed to generate form'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStatementClick = (statement: WitnessStatement) => {
    setSelectedStatement(statement);
    setShowDetailDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={direction}>
      {/* Locked Banner for Closed Incidents */}
      {isLocked && (
        <Alert className="border-muted bg-muted/50">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            {t('investigation.witnesses.lockedClosed', 'This incident is closed. Witness statements cannot be modified.')}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-medium">
          {t('investigation.witnesses.title', 'Witness Statements')}
        </h3>
        {!isLocked && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadForm}
              disabled={isGenerating || !incident}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 me-2" />
              )}
              {t('investigation.witnesses.downloadForm', 'Download Form')}
            </Button>
            <WitnessTaskAssignment 
              incidentId={incidentId} 
              onAssigned={refetch}
            />
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction}>
        <TabsList className={isLocked ? "grid w-full grid-cols-1" : "grid w-full grid-cols-4"}>
          <TabsTrigger value="list">
            {t('investigation.witnesses.statementsList', 'Statements')} ({statements.length})
          </TabsTrigger>
          {!isLocked && (
            <>
              <TabsTrigger value="upload">
                <Upload className="h-4 w-4 me-2" />
                {t('investigation.witnesses.documentUpload', 'Upload')}
              </TabsTrigger>
              <TabsTrigger value="direct">
                <Edit className="h-4 w-4 me-2" />
                {t('investigation.witnesses.directEntry', 'Direct Entry')}
              </TabsTrigger>
              <TabsTrigger value="voice">
                <Mic className="h-4 w-4 me-2" />
                {t('investigation.witnesses.voiceRecording', 'Voice')}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="list" className="mt-4">
          {statements.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t('investigation.witnesses.noWitnesses', 'No witness statements recorded yet.')}</p>
                <p className="text-sm mt-2">
                  {t('investigation.witnesses.selectMethod', 'Select a collection method above to add a statement.')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {statements.map((witness) => (
                <Card 
                  key={witness.id} 
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => handleStatementClick(witness)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {witness.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatementTypeBadgeVariant(witness.statement_type as StatementType)}>
                          {getStatementTypeIcon(witness.statement_type as StatementType)}
                          <span className="ms-1">
                            {t(`investigation.witnesses.type.${witness.statement_type}`, witness.statement_type)}
                          </span>
                        </Badge>
                        {witness.assignment_status && (
                          <Badge variant="outline">
                            {t(`investigation.witnesses.status.${witness.assignment_status}`, witness.assignment_status)}
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {witness.created_at && format(new Date(witness.created_at), 'MMM d, yyyy')}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
                      </div>
                    </div>
                    {(witness.contact || witness.relationship) && (
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        {witness.contact && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {witness.contact}
                          </span>
                        )}
                        {witness.relationship && (
                          <span>{witness.relationship}</span>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm whitespace-pre-wrap line-clamp-3">{witness.statement}</p>
                    </div>
                    {witness.ai_analysis && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-md">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {t('investigation.witnesses.aiAnalysis', 'AI Analysis')}
                        </p>
                        {(witness.ai_analysis as Record<string, unknown>).summary && (
                          <p className="text-sm line-clamp-2">{String((witness.ai_analysis as Record<string, unknown>).summary)}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {!isLocked && (
          <>
            <TabsContent value="upload" className="mt-4">
              <WitnessDocumentUpload
                incidentId={incidentId}
                onSuccess={handleStatementAdded}
              />
            </TabsContent>

            <TabsContent value="direct" className="mt-4">
              <WitnessDirectEntry
                incidentId={incidentId}
                onSuccess={handleStatementAdded}
              />
            </TabsContent>

            <TabsContent value="voice" className="mt-4">
              <WitnessVoiceRecording
                incidentId={incidentId}
                onSuccess={handleStatementAdded}
              />
            </TabsContent>
          </>
        )}
      </Tabs>

      <WitnessDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        statement={selectedStatement}
        incident={incident}
      />
    </div>
  );
}
