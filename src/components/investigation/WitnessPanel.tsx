import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, User, Phone, MessageSquare, Mic, Edit, Upload, FileDown, ChevronRight, Lock, CheckCircle, RotateCcw, Eye } from "lucide-react";
import { format } from "date-fns";
import { useWitnessStatements, useReviewWitnessStatement, WitnessStatement } from "@/hooks/use-witness-statements";
import { WitnessDocumentUpload } from "./WitnessDocumentUpload";
import { WitnessDirectEntry } from "./WitnessDirectEntry";
import { WitnessVoiceRecording } from "./WitnessVoiceRecording";
import { WitnessTaskAssignment } from "./WitnessTaskAssignment";
import { WitnessDetailDialog } from "./WitnessDetailDialog";
import { WitnessReviewDialog } from "./WitnessReviewDialog";
import { generateWitnessWordDoc, WitnessFormData } from "@/lib/generate-witness-word-doc";
import { useTheme } from "@/contexts/ThemeContext";
import { useDocumentBranding } from "@/hooks/use-document-branding";
import { useUserRoles } from "@/hooks/use-user-roles";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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

const getStatusBadge = (status: string | null, t: (key: string, fallback: string) => string) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="border-amber-500 text-amber-600">{t("investigation.witnesses.status.pending", "Pending")}</Badge>;
    case 'in_progress':
      return <Badge variant="outline" className="border-blue-500 text-blue-600">{t("investigation.witnesses.status.in_progress", "In Progress")}</Badge>;
    case 'completed':
      return <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">{t("investigation.witnesses.status.completed", "Awaiting Review")}</Badge>;
    case 'approved':
      return <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t("investigation.witnesses.status.approved", "Approved")}</Badge>;
    default:
      return null;
  }
};

export function WitnessPanel({ incidentId, incident, incidentStatus, canEdit: canEditProp }: WitnessPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { tenantName } = useTheme();
  const { settings: documentSettings } = useDocumentBranding();
  const { hasRole } = useUserRoles();
  const [activeTab, setActiveTab] = useState<string>("list");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<WitnessStatement | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [statementForReview, setStatementForReview] = useState<WitnessStatement | null>(null);

  const { statements, isLoading, refetch } = useWitnessStatements(incidentId);
  const reviewStatement = useReviewWitnessStatement();
  
  // Check if user can review statements (HSSE Expert, HSSE Manager, Environmental)
  const canReviewStatements = hasRole('hsse_expert') || hasRole('hsse_manager') || hasRole('environmental') || hasRole('admin');
  
  // Read-only mode when incident is closed OR canEdit prop is explicitly false
  const isLocked = incidentStatus === 'closed' || canEditProp === false;

  // Count statements awaiting review
  const awaitingReviewCount = statements.filter(s => s.assignment_status === 'completed').length;

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

  const handleReviewClick = (e: React.MouseEvent, statement: WitnessStatement) => {
    e.stopPropagation();
    setStatementForReview(statement);
    setShowReviewDialog(true);
  };

  const handleApproveStatement = async (statementId: string) => {
    await reviewStatement.mutateAsync({ id: statementId, action: "approve" });
  };

  const handleReturnStatement = async (statementId: string, returnReason: string) => {
    const statement = statements.find(s => s.id === statementId);
    await reviewStatement.mutateAsync({ id: statementId, action: "return", returnReason });
    
    // Send notification email to witness
    if (statement?.assigned_witness_id) {
      try {
        await supabase.functions.invoke('send-action-email', {
          body: {
            type: 'witness_statement_returned',
            recipient_id: statement.assigned_witness_id,
            incident_reference: incident?.reference_id,
            incident_title: incident?.title,
            return_reason: returnReason,
            return_count: (statement.return_count || 0) + 1,
            tenant_name: tenantName,
          }
        });
      } catch (error) {
        console.error('Failed to send return notification:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-hidden" dir={direction}>
      {/* Locked Banner for Closed Incidents */}
      {incidentStatus === 'closed' && (
        <Alert className="border-muted bg-muted/50">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            {t('investigation.witnesses.lockedClosed', 'This incident is closed. Witness statements cannot be modified.')}
          </AlertDescription>
        </Alert>
      )}

      {/* Read-Only Oversight Banner - For non-investigators */}
      {isLocked && incidentStatus !== 'closed' && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
          <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            {t('investigation.readOnlyOversight', 'You are viewing this investigation in read-only mode. Only the assigned investigator can make changes.')}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium">
            {t('investigation.witnesses.title', 'Witness Statements')}
          </h3>
          {awaitingReviewCount > 0 && canReviewStatements && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              {awaitingReviewCount} {t('investigation.witnesses.awaitingReview', 'awaiting review')}
            </Badge>
          )}
        </div>
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
                  className={cn(
                    "cursor-pointer hover:border-primary/50 transition-colors overflow-hidden",
                    witness.assignment_status === 'completed' && canReviewStatements && "border-orange-300 dark:border-orange-700"
                  )}
                  onClick={() => handleStatementClick(witness)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2 min-w-0">
                        <User className="h-4 w-4 shrink-0" />
                        <span className="truncate">{witness.name}</span>
                      </CardTitle>
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <Badge variant={getStatementTypeBadgeVariant(witness.statement_type as StatementType)}>
                          {getStatementTypeIcon(witness.statement_type as StatementType)}
                          <span className="ms-1">
                            {t(`investigation.witnesses.type.${witness.statement_type}`, witness.statement_type)}
                          </span>
                        </Badge>
                        {getStatusBadge(witness.assignment_status, t)}
                        {witness.return_count > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <RotateCcw className="h-3 w-3" />
                            {witness.return_count}x
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
                  <CardContent className="min-w-0 overflow-hidden">
                    <div className="flex items-start gap-2 min-w-0">
                      <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm whitespace-pre-wrap line-clamp-3 break-words">{witness.statement}</p>
                    </div>
                    
                    {/* Return reason banner */}
                    {witness.return_reason && witness.assignment_status === 'pending' && (
                      <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                        <div className="flex items-center gap-2 text-destructive font-medium text-sm mb-1">
                          <RotateCcw className="h-4 w-4" />
                          {t('investigation.witnesses.returnedForCorrection', 'Returned for Correction')}
                        </div>
                        <p className="text-sm text-muted-foreground">{witness.return_reason}</p>
                      </div>
                    )}
                    
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

                    {/* Review button for completed statements */}
                    {witness.assignment_status === 'completed' && canReviewStatements && !isLocked && (
                      <div className="mt-3 flex justify-end">
                        <Button 
                          size="sm" 
                          onClick={(e) => handleReviewClick(e, witness)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          {t('investigation.witnesses.reviewStatement', 'Review Statement')}
                        </Button>
                      </div>
                    )}

                    {/* Approved indicator */}
                    {witness.assignment_status === 'approved' && (
                      <div className="mt-3 flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        {t('investigation.witnesses.statementApproved', 'Statement approved')}
                        {witness.reviewed_at && (
                          <span className="text-muted-foreground">
                            • {format(new Date(witness.reviewed_at), 'MMM d, yyyy')}
                          </span>
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

      <WitnessReviewDialog
        open={showReviewDialog}
        onOpenChange={setShowReviewDialog}
        statement={statementForReview}
        onApprove={handleApproveStatement}
        onReturn={handleReturnStatement}
        isProcessing={reviewStatement.isPending}
      />
    </div>
  );
}
