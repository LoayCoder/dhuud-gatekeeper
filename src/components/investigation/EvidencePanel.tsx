import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, Image, FileText, Video, Camera, ClipboardList, Shield, MessageSquare, Download, Trash2, User, Calendar, Link, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { compressImage } from '@/lib/upload-utils';
import { 
  useEvidenceItems, 
  useCreateEvidence, 
  useUpdateEvidenceReview, 
  useDeleteEvidence,
  type EvidenceItem,
  type CreateEvidenceParams
} from '@/hooks/use-evidence-items';
import { EvidenceUploadDialog } from './EvidenceUploadDialog';
import { EvidenceReviewDialog } from './EvidenceReviewDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EvidencePanelProps {
  incidentId: string;
  incidentStatus?: string | null;
  canEdit?: boolean;
}

const evidenceTypeIcons: Record<string, React.ReactNode> = {
  photo: <Image className="h-5 w-5" />,
  document: <FileText className="h-5 w-5" />,
  cctv: <Camera className="h-5 w-5" />,
  ptw: <Shield className="h-5 w-5" />,
  checklist: <ClipboardList className="h-5 w-5" />,
  video_clip: <Video className="h-5 w-5" />,
};

export function EvidencePanel({ incidentId, incidentStatus, canEdit: canEditProp }: EvidencePanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);

  // Read-only: locked when closed OR canEdit prop is explicitly false
  const isLocked = incidentStatus === 'closed' || canEditProp === false;

  const { data: evidenceItems, isLoading } = useEvidenceItems(incidentId);
  const createEvidence = useCreateEvidence();
  const updateReview = useUpdateEvidenceReview();
  const deleteEvidence = useDeleteEvidence();

  const storagePath = `${profile?.tenant_id}/${incidentId}`;

  const handleUpload = async (params: CreateEvidenceParams, file?: File) => {
    let uploadedPath: string | undefined;
    let fileName: string | undefined;
    let fileSize: number | undefined;
    let mimeType: string | undefined;

    if (file) {
      // Compress images before upload
      const processedFile = await compressImage(file, 1920, 0.85);
      
      const filePath = `${storagePath}/${Date.now()}-${processedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('incident-attachments')
        .upload(filePath, processedFile);

      if (uploadError) {
        toast.error(t('common.error', 'Error: ') + uploadError.message);
        return;
      }

      uploadedPath = filePath;
      fileName = file.name; // Keep original name
      fileSize = processedFile.size;
      mimeType = processedFile.type;
    }

    await createEvidence.mutateAsync({
      ...params,
      storage_path: uploadedPath,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
    });
  };

  const handleReview = async (comment: string) => {
    if (!selectedEvidence) return;
    await updateReview.mutateAsync({
      id: selectedEvidence.id,
      review_comment: comment,
    });
  };

  const handleDelete = async () => {
    if (!selectedEvidence) return;

    // Delete file from storage if exists
    if (selectedEvidence.storage_path) {
      await supabase.storage
        .from('incident-attachments')
        .remove([selectedEvidence.storage_path]);
    }

    await deleteEvidence.mutateAsync(selectedEvidence.id);
    setDeleteDialogOpen(false);
    setSelectedEvidence(null);
  };

  const handleDownload = async (evidence: EvidenceItem) => {
    if (!evidence.storage_path) return;

    const { data, error } = await supabase.storage
      .from('incident-attachments')
      .download(evidence.storage_path);

    if (error) {
      toast.error(t('common.error', 'Error: ') + error.message);
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = evidence.file_name || 'download';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
      {/* Locked Banner - Closed Incident */}
      {incidentStatus === 'closed' && (
        <Alert variant="default" className="bg-muted border-muted-foreground/20">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            {t('investigation.evidence.lockedClosed', 'This incident is closed. Evidence cannot be modified.')}
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-medium">
            {t('investigation.evidence.title', 'Evidence Management')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('investigation.evidence.subtitle', 'Upload and manage investigation evidence')}
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)} disabled={isLocked}>
          <Upload className="h-4 w-4 me-2" />
          {t('investigation.evidence.upload.button', 'Add Evidence')}
        </Button>
      </div>

      {/* Evidence Grid */}
      {(!evidenceItems || evidenceItems.length === 0) ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t('investigation.evidence.noItems', 'No evidence uploaded yet.')}</p>
            <p className="text-sm mt-1">
              {t('investigation.evidence.noItemsHint', 'Click "Add Evidence" to upload photos, documents, CCTV data, and more.')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {evidenceItems.map((evidence) => (
            <Card key={evidence.id} className="overflow-hidden min-w-0">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {evidenceTypeIcons[evidence.evidence_type]}
                    </div>
                    <div>
                      <Badge variant="outline" className="text-xs">
                        {t(`investigation.evidence.types.${evidence.evidence_type}`, evidence.evidence_type)}
                      </Badge>
                      {evidence.review_comment && (
                        <Badge variant="secondary" className="ms-1 text-xs">
                          <MessageSquare className="h-3 w-3 me-1" />
                          {t('investigation.evidence.reviewed', 'Reviewed')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 min-w-0 overflow-hidden">
                {/* File/Reference Info */}
                {evidence.file_name && (
                  <div>
                    <p className="font-medium truncate text-sm" title={evidence.file_name}>
                      {evidence.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(evidence.file_size)}
                    </p>
                  </div>
                )}

                {evidence.reference_id && (
                  <div className="flex items-center gap-2 text-sm">
                    <Link className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{evidence.reference_id}</span>
                  </div>
                )}

                {/* CCTV Data Summary */}
                {evidence.evidence_type === 'cctv' && evidence.cctv_data && (
                  <div className="text-sm space-y-1">
                    {(evidence.cctv_data as any[]).map((cam: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-muted-foreground">
                        <Camera className="h-3 w-3" />
                        <span>{cam.camera_id} - {cam.location}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Description */}
                {evidence.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {evidence.description}
                  </p>
                )}

                {/* Uploader & Session Info */}
                <div className="pt-2 border-t space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{evidence.uploader_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(evidence.created_at), 'MMM d, yyyy HH:mm')}</span>
                  </div>
                  {evidence.upload_session_id && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      <span className="font-mono truncate" title={evidence.upload_session_id}>
                        {t('investigation.evidence.security.session', 'Session')}: {evidence.upload_session_id.slice(0, 8)}...
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  {evidence.storage_path && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(evidence)}
                    >
                      <Download className="h-4 w-4 me-1" />
                      {t('common.download', 'Download')}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedEvidence(evidence);
                      setReviewDialogOpen(true);
                    }}
                  >
                    <MessageSquare className="h-4 w-4 me-1" />
                    {t('investigation.evidence.review.button', 'Review')}
                  </Button>
                  {!isLocked && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive ms-auto"
                      onClick={() => {
                        setSelectedEvidence(evidence);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <EvidenceUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        incidentId={incidentId}
        onSubmit={handleUpload}
        isSubmitting={createEvidence.isPending}
      />

      {/* Review Dialog */}
      <EvidenceReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        evidence={selectedEvidence}
        onSubmit={handleReview}
        isSubmitting={updateReview.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('investigation.evidence.delete.title', 'Delete Evidence')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('investigation.evidence.delete.description', 'Are you sure you want to delete this evidence? This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEvidence.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('common.delete', 'Delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
