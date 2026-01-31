import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  MessageSquare, 
  User, 
  Calendar, 
  Download, 
  FileText, 
  Image, 
  Video, 
  Camera,
  FileIcon,
  Clock,
  Hash,
  HardDrive,
  Link as LinkIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { EvidenceItem, CCTVCamera } from '@/hooks/use-evidence-items';

interface EvidenceReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evidence: EvidenceItem | null;
  onSubmit: (comment: string) => Promise<void>;
  isSubmitting?: boolean;
}

// Format file size
function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Get evidence type icon
function getEvidenceIcon(type: string) {
  switch (type) {
    case 'photo':
      return <Image className="h-4 w-4" />;
    case 'video_clip':
      return <Video className="h-4 w-4" />;
    case 'cctv':
      return <Camera className="h-4 w-4" />;
    case 'document':
      return <FileText className="h-4 w-4" />;
    default:
      return <FileIcon className="h-4 w-4" />;
  }
}

export function EvidenceReviewDialog({
  open,
  onOpenChange,
  evidence,
  onSubmit,
  isSubmitting = false,
}: EvidenceReviewDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [comment, setComment] = useState(evidence?.review_comment || '');

  // Get signed URL for file preview/download
  const fileUrl = useMemo(() => {
    if (!evidence?.storage_path) return null;
    const { data } = supabase.storage
      .from('incident-attachments')
      .getPublicUrl(evidence.storage_path);
    return data?.publicUrl || null;
  }, [evidence?.storage_path]);

  // Parse CCTV data
  const cctvEntries: CCTVCamera[] = useMemo(() => {
    if (!evidence?.cctv_data) return [];
    try {
      const data = evidence.cctv_data;
      if (Array.isArray(data)) return data;
      return [];
    } catch {
      return [];
    }
  }, [evidence?.cctv_data]);

  const handleSubmit = async () => {
    await onSubmit(comment);
    onOpenChange(false);
  };

  // Reset comment when evidence changes
  const handleOpenChange = (open: boolean) => {
    if (open && evidence) {
      setComment(evidence.review_comment || '');
    }
    onOpenChange(open);
  };

  const handleDownload = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  if (!evidence) return null;

  const isImage = evidence.evidence_type === 'photo' || evidence.mime_type?.startsWith('image/');
  const isVideo = evidence.evidence_type === 'video_clip' || evidence.mime_type?.startsWith('video/');
  const isCCTV = evidence.evidence_type === 'cctv';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('investigation.evidence.review.title', 'Review Evidence')}
          </DialogTitle>
          <DialogDescription>
            {t('investigation.evidence.review.fullDescription', 'Review all evidence details and add your comments.')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pe-4">
          <div className="space-y-4">
            {/* File Preview Section */}
            {fileUrl && (isImage || isVideo) && (
              <div className="rounded-lg border overflow-hidden bg-muted/30">
                {isImage && (
                  <img 
                    src={fileUrl} 
                    alt={evidence.file_name || 'Evidence'} 
                    className="w-full max-h-64 object-contain"
                  />
                )}
                {isVideo && (
                  <video 
                    src={fileUrl} 
                    controls 
                    className="w-full max-h-64"
                    preload="metadata"
                  >
                    {t('investigation.evidence.review.videoNotSupported', 'Your browser does not support video playback.')}
                  </video>
                )}
              </div>
            )}

            {/* Document/Non-media file indicator */}
            {fileUrl && !isImage && !isVideo && !isCCTV && (
              <div className="rounded-lg border p-6 bg-muted/30 flex flex-col items-center justify-center gap-3">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {evidence.file_name || t('investigation.evidence.review.documentFile', 'Document File')}
                </span>
              </div>
            )}

            {/* Evidence Details Grid */}
            <div className="rounded-lg border p-4 bg-card space-y-3">
              <h4 className="font-medium flex items-center gap-2 text-sm">
                <FileIcon className="h-4 w-4" />
                {t('investigation.evidence.review.details', 'Evidence Details')}
              </h4>
              <Separator />
              
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {/* Type */}
                <div className="text-muted-foreground">{t('investigation.evidence.type', 'Type')}</div>
                <div className="flex items-center gap-2">
                  {getEvidenceIcon(evidence.evidence_type)}
                  <Badge variant="outline">
                    {t(`investigation.evidence.types.${evidence.evidence_type}`, evidence.evidence_type)}
                  </Badge>
                </div>

                {/* File Name */}
                {evidence.file_name && (
                  <>
                    <div className="text-muted-foreground">{t('investigation.evidence.review.fileName', 'File Name')}</div>
                    <div className="break-all">{evidence.file_name}</div>
                  </>
                )}

                {/* File Size */}
                {evidence.file_size && (
                  <>
                    <div className="text-muted-foreground flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      {t('investigation.evidence.review.fileSize', 'File Size')}
                    </div>
                    <div>{formatFileSize(evidence.file_size)}</div>
                  </>
                )}

                {/* MIME Type */}
                {evidence.mime_type && (
                  <>
                    <div className="text-muted-foreground">{t('investigation.evidence.review.mimeType', 'MIME Type')}</div>
                    <div className="font-mono text-xs">{evidence.mime_type}</div>
                  </>
                )}

                {/* Reference ID (for PTW/Checklist) */}
                {evidence.reference_id && (
                  <>
                    <div className="text-muted-foreground flex items-center gap-1">
                      <LinkIcon className="h-3 w-3" />
                      {t('investigation.evidence.review.referenceId', 'Reference ID')}
                    </div>
                    <div className="font-mono text-xs">{evidence.reference_id}</div>
                  </>
                )}

                {/* Reference Type */}
                {evidence.reference_type && (
                  <>
                    <div className="text-muted-foreground">{t('investigation.evidence.review.referenceType', 'Reference Type')}</div>
                    <div>{evidence.reference_type}</div>
                  </>
                )}

                {/* Evidence ID */}
                <>
                  <div className="text-muted-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {t('investigation.evidence.review.evidenceId', 'Evidence ID')}
                  </div>
                  <div className="font-mono text-xs truncate" title={evidence.id}>{evidence.id.slice(0, 8)}...</div>
                </>

                {/* Upload Session ID */}
                {evidence.upload_session_id && (
                  <>
                    <div className="text-muted-foreground">{t('investigation.evidence.review.sessionId', 'Session ID')}</div>
                    <div className="font-mono text-xs truncate" title={evidence.upload_session_id}>
                      {evidence.upload_session_id.slice(0, 8)}...
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* CCTV Cameras Section */}
            {isCCTV && cctvEntries.length > 0 && (
              <div className="rounded-lg border p-4 bg-card space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-sm">
                  <Camera className="h-4 w-4" />
                  {t('investigation.evidence.review.cctvCameras', 'CCTV Cameras')}
                  <Badge variant="secondary" className="ms-auto">{cctvEntries.length}</Badge>
                </h4>
                <Separator />
                
                <div className="space-y-2">
                  {cctvEntries.map((entry, index) => (
                    <div key={index} className="rounded-md border p-3 bg-muted/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm flex items-center gap-2">
                          <Camera className="h-3 w-3" />
                          {entry.camera_id}
                        </span>
                        {entry.location && (
                          <span className="text-xs text-muted-foreground">{entry.location}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{entry.date}</span>
                        <span className="mx-1">•</span>
                        <Clock className="h-3 w-3" />
                        <span>{entry.start_time} - {entry.end_time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {evidence.description && (
              <div className="rounded-lg border p-4 bg-card space-y-2">
                <h4 className="font-medium text-sm">{t('investigation.evidence.description', 'Description')}</h4>
                <Separator />
                <p className="text-sm whitespace-pre-wrap">{evidence.description}</p>
              </div>
            )}

            {/* Upload Info */}
            <div className="rounded-lg border p-3 bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t('investigation.evidence.review.uploadedBy', 'Uploaded By')}</span>
                <span>{evidence.uploader_name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{t('investigation.evidence.review.createdAt', 'Created')}: {format(new Date(evidence.created_at), 'MMM d, yyyy HH:mm')}</span>
                </div>
                {evidence.updated_at && evidence.updated_at !== evidence.created_at && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{t('investigation.evidence.review.updatedAt', 'Updated')}: {format(new Date(evidence.updated_at), 'MMM d, yyyy HH:mm')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Previous Review (if exists) */}
            {evidence.reviewed_at && evidence.reviewer_name && (
              <div className="rounded-lg border p-4 bg-primary/5 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  {t('investigation.evidence.review.previousReview', 'Previous Review')}
                </div>
                <Separator />
                <p className="text-sm whitespace-pre-wrap">{evidence.review_comment}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{evidence.reviewer_name}</span>
                  <span>•</span>
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(evidence.reviewed_at), 'MMM d, yyyy HH:mm')}</span>
                </div>
              </div>
            )}

            {/* Review Comment Input */}
            <div className="space-y-2">
              <Label htmlFor="review-comment">
                {t('investigation.evidence.review.comment', 'Review Comment')} *
              </Label>
              <Textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('investigation.evidence.review.placeholder', 'Enter your review comment...')}
                rows={4}
                required
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {fileUrl && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              className="sm:me-auto"
            >
              <Download className="h-4 w-4 me-2" />
              {t('investigation.evidence.review.download', 'Download')}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!comment.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                {t('common.saving', 'Saving...')}
              </>
            ) : (
              t('investigation.evidence.review.submit', 'Save Review')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
