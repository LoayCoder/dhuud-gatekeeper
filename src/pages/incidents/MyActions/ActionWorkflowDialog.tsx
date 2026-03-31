import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PlayCircle, Upload, FileCheck, AlertTriangle, Loader2 } from 'lucide-react';
import type { ActionForDialog } from './types';

interface ActionWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: ActionForDialog | null;
  mode: 'start' | 'complete';
  onConfirm: (data: { notes: string; overdueJustification?: string; files: File[] }) => void;
  isSubmitting?: boolean;
}

export function ActionWorkflowDialog({
  open, onOpenChange, action, mode, onConfirm, isSubmitting,
}: ActionWorkflowDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [notes, setNotes] = useState('');
  const [overdueJustification, setOverdueJustification] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOverdue = action?.due_date ? new Date(action.due_date) < new Date() : false;
  const isComplete = mode === 'complete';

  const handleSubmit = () => {
    if (isComplete && !notes.trim()) return;
    onConfirm({
      notes: notes.trim(),
      overdueJustification: isOverdue ? overdueJustification.trim() : undefined,
      files,
    });
    resetForm();
  };

  const resetForm = () => {
    setNotes('');
    setOverdueJustification('');
    setFiles([]);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent dir={direction} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              <><FileCheck className="h-5 w-5 text-primary" /> {t('actions.submitForVerification', 'Submit for Verification')}</>
            ) : (
              <><PlayCircle className="h-5 w-5 text-primary" /> {t('investigation.actions.startWork', 'Start Work')}</>
            )}
          </DialogTitle>
          <DialogDescription>{action.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action Info */}
          <div className="rounded-md bg-muted p-3 space-y-1">
            <p className="text-sm font-medium">{action.title}</p>
            {action.description && <p className="text-xs text-muted-foreground line-clamp-2">{action.description}</p>}
            <div className="flex items-center gap-2 flex-wrap">
              {action.priority && <Badge variant="outline" className="text-xs">{action.priority}</Badge>}
              {action.due_date && (
                <span className="text-xs text-muted-foreground">
                  {t('investigation.dueDate', 'Due Date')}: {new Date(action.due_date).toLocaleDateString(i18n.language)}
                </span>
              )}
            </div>
          </div>

          {/* Return feedback banner */}
          {action.status === 'returned_for_correction' && (
            <div className="rounded-md bg-warning/10 border border-warning/30 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-warning">{t('actions.returnedForCorrection', 'Returned for Correction')}</p>
                <p className="text-xs text-muted-foreground">{t('actions.pleaseReviewFeedback', 'Please review the feedback and resubmit.')}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="workflow-notes">
              {isComplete
                ? t('actions.completionNotes', 'Completion Notes') + ' *'
                : t('actions.progressNotes', 'Progress Notes')}
            </Label>
            <Textarea
              id="workflow-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isComplete
                ? t('actions.describeWorkCompleted', 'Describe the work completed...')
                : t('actions.optionalProgressNotes', 'Optional progress notes...')}
              rows={3}
            />
          </div>

          {/* Evidence Upload (complete mode) */}
          {isComplete && (
            <div className="space-y-2">
              <Label>{t('actions.evidence', 'Evidence')}</Label>
              <div
                className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">{t('actions.clickToUpload', 'Click to upload files')}</p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx"
                />
              </div>
              {files.length > 0 && (
                <div className="space-y-1">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-muted rounded px-2 py-1">
                      <span className="truncate">{file.name}</span>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => removeFile(i)}>×</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Overdue Justification */}
          {isOverdue && isComplete && (
            <div className="space-y-2">
              <Label htmlFor="overdue-justification" className="flex items-center gap-1 text-warning">
                <AlertTriangle className="h-3 w-3" />
                {t('actions.overdueJustification', 'Overdue Justification')}
              </Label>
              <Textarea
                id="overdue-justification"
                value={overdueJustification}
                onChange={(e) => setOverdueJustification(e.target.value)}
                placeholder={t('actions.explainDelay', 'Explain the reason for the delay...')}
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || (isComplete && !notes.trim())}>
            {isSubmitting && <Loader2 className="h-4 w-4 me-1 animate-spin" />}
            {isComplete
              ? t('actions.submitForVerification', 'Submit for Verification')
              : t('investigation.actions.startWork', 'Start Work')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
