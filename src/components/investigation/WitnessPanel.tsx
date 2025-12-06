import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, User, Phone, MessageSquare, FileText, Mic, Edit, Upload } from "lucide-react";
import { format } from "date-fns";
import { useWitnessStatements } from "@/hooks/use-witness-statements";
import { WitnessDocumentUpload } from "./WitnessDocumentUpload";
import { WitnessDirectEntry } from "./WitnessDirectEntry";
import { WitnessVoiceRecording } from "./WitnessVoiceRecording";
import { WitnessTaskAssignment } from "./WitnessTaskAssignment";

interface WitnessPanelProps {
  incidentId: string;
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

export function WitnessPanel({ incidentId }: WitnessPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [activeTab, setActiveTab] = useState<string>("list");

  const { statements, isLoading, refetch } = useWitnessStatements(incidentId);

  const handleStatementAdded = () => {
    refetch();
    setActiveTab("list");
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {t('investigation.witnesses.title', 'Witness Statements')}
        </h3>
        <WitnessTaskAssignment 
          incidentId={incidentId} 
          onAssigned={refetch}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list">
            {t('investigation.witnesses.statementsList', 'Statements')} ({statements.length})
          </TabsTrigger>
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
                <Card key={witness.id}>
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
                      <p className="text-sm whitespace-pre-wrap">{witness.statement}</p>
                    </div>
                    {witness.ai_analysis && (
                      <div className="mt-3 p-3 bg-muted/50 rounded-md">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {t('investigation.witnesses.aiAnalysis', 'AI Analysis')}
                        </p>
                        {(witness.ai_analysis as Record<string, unknown>).summary && (
                          <p className="text-sm">{String((witness.ai_analysis as Record<string, unknown>).summary)}</p>
                        )}
                        {(witness.ai_analysis as Record<string, { detected?: string[] }>).emotional_cues?.detected?.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {(witness.ai_analysis as Record<string, { detected?: string[] }>).emotional_cues?.detected?.map((cue: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {cue}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

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
      </Tabs>
    </div>
  );
}
