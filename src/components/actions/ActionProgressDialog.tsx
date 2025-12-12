import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayCircle, CheckCircle2, Upload, AlertTriangle, Loader2, Image, FileText } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useActionEvidence } from '@/hooks/use-action-evidence';
import { useDropzone } from 'react-dropzone';

interface ActionProgressDialogProps {
  action: {
    id: string;
    title: string;
    description?: string | null;
    status?: string | null;
    due_date?: string | null;
    priority?: string | null;
    incident_id?: string | null;
  } | null;
  mode: 'start' | 'complete';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { notes: string; overdueJustification?: string; files: File[] }) => void;
  isSubmitting?: boolean;
}

export function ActionProgressDialog({
  action,
  mode,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting = false,
}: ActionProgressDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [notes, setNotes] = useState('');
  const [overdueJustification, setOverdueJustification] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);

  const { data: existingEvidence } = useActionEvidence(action?.id || null);

  // Check if action is overdue
  const isOverdue = action?.due_date && new Date(action.due_date) < new Date();
  
  // Calculate evidence count
  const evidenceCount = existingEvidence?.length || 0;
  const hasMinimumEvidence = evidenceCount > 0 || uploadingFiles.length > 0;

  // Validation
  const isValid = mode === 'start'
    ? notes.trim().length >= 5 && hasMinimumEvidence
    : notes.trim().length >= 10 && hasMinimumEvidence && (!isOverdue || overdueJustification.trim().length >= 10);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.heic'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles) => {
      setUploadingFiles((prev) => [...prev, ...acceptedFiles]);
    },
  });

  const handleConfirm = async () => {
    if (!action) return;

    // Pass files to parent - parent will handle upload with incident context
    onConfirm({
      notes: notes.trim(),
      overdueJustification: isOverdue ? overdueJustification.trim() : undefined,
      files: uploadingFiles,
    });
  };

  const handleClose = () => {
    setNotes('');
    setOverdueJustification('');
    setUploadingFiles([]);
    onOpenChange(false);
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setNotes('');
      setOverdueJustification('');
      setUploadingFiles([]);
    }
  }, [open]);

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'start' ? (
              <PlayCircle className="h-5 w-5 text-primary" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            {mode === 'start'
              ? t('actions.startWork', 'Start Work on Action')
              : t('actions.completeAction', 'Complete Action')
            }
          </DialogTitle>
          <DialogDescription>
            {mode === 'start'
              ? t('actions.startWorkDescription', 'Upload evidence and add progress notes to begin work on this action.')
              : t('actions.completeActionDescription', 'Upload completion evidence and notes to submit this action for verification.')
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action Info */}
          <div className="p-3 bg-muted rounded-md">
            <h4 className="font-medium">{action.title}</h4>
            {action.description && (
              <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {action.priority && (
                <Badge variant={action.priority === 'critical' || action.priority === 'high' ? 'destructive' : 'secondary'}>
                  {t(`investigation.priority.${action.priority}`, action.priority)}
                </Badge>
              )}
              {action.due_date && (
                <span className={`text-sm ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {t('actions.dueDate', 'Due')}: {new Date(action.due_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Overdue Warning */}
          {isOverdue && mode === 'complete' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('actions.overdueWarning', 'This action is overdue. You must provide a justification for the delay.')}
              </AlertDescription>
            </Alert>
          )}

          {/* Evidence Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {t('actions.uploadEvidence', 'Upload Evidence')} *
            </Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive
                    ? t('actions.dropFilesHere', 'Drop files here...')
                    : t('actions.dragOrClickToUpload', 'Drag & drop files or click to browse')
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('actions.acceptedFormats', 'Photos (JPG, PNG) or Documents (PDF, DOC) - Max 10MB')}
                </p>
              </div>
            </div>

            {/* Pending uploads */}
            {uploadingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {uploadingFiles.map((file, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {file.type.startsWith('image/') ? (
                      <Image className="h-3 w-3" />
                    ) : (
                      <FileText className="h-3 w-3" />
                    )}
                    {file.name}
                    <button
                      onClick={() => setUploadingFiles(prev => prev.filter((_, i) => i !== idx))}
                      className="ms-1 text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Existing evidence count */}
            {evidenceCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {t('actions.existingEvidence', '{{count}} existing evidence items', { count: evidenceCount })}
              </p>
            )}

            {!hasMinimumEvidence && (
              <p className="text-sm text-destructive">
                {t('actions.evidenceRequired', 'At least one evidence file is required')}
              </p>
          )}
          </div>

          <Separator />

          {/* Notes Input */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              {mode === 'start'
                ? t('actions.progressNotes', 'Progress Notes') + ' *'
                : t('actions.completionNotes', 'Completion Notes') + ' *'
              }
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                mode === 'start'
                  ? t('actions.progressNotesPlaceholder', 'Describe what you plan to do...')
                  : t('actions.completionNotesPlaceholder', 'Describe what was done to complete this action...')
              }
              rows={3}
              className={notes.trim().length > 0 && notes.trim().length < (mode === 'start' ? 5 : 10) ? 'border-destructive' : ''}
            />
            <p className="text-xs text-muted-foreground">
              {mode === 'start'
                ? t('actions.minChars', 'Minimum 5 characters')
                : t('actions.minChars10', 'Minimum 10 characters')
              }
            </p>
          </div>

          {/* Overdue Justification */}
          {isOverdue && mode === 'complete' && (
            <div className="space-y-2">
              <Label htmlFor="justification" className="text-destructive">
                {t('actions.overdueJustification', 'Overdue Justification')} *
              </Label>
              <Textarea
                id="justification"
                value={overdueJustification}
                onChange={(e) => setOverdueJustification(e.target.value)}
                placeholder={t('actions.overdueJustificationPlaceholder', 'Explain why this action was not completed on time...')}
                rows={2}
                className={overdueJustification.trim().length > 0 && overdueJustification.trim().length < 10 ? 'border-destructive' : ''}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {mode === 'start'
              ? t('actions.startWorkButton', 'Start Work')
              : t('actions.submitForVerification', 'Submit for Verification')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
