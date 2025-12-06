import { useState } from 'react';
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
import { Loader2, MessageSquare, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import type { EvidenceItem } from '@/hooks/use-evidence-items';

interface EvidenceReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evidence: EvidenceItem | null;
  onSubmit: (comment: string) => Promise<void>;
  isSubmitting?: boolean;
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

  if (!evidence) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('investigation.evidence.review.title', 'Review Evidence')}
          </DialogTitle>
          <DialogDescription>
            {t('investigation.evidence.review.description', 'Add your review comment for this evidence item.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Evidence Info */}
          <div className="rounded-lg border p-3 bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline">
                {t(`investigation.evidence.types.${evidence.evidence_type}`, evidence.evidence_type)}
              </Badge>
              {evidence.file_name && (
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {evidence.file_name}
                </span>
              )}
            </div>
            {evidence.description && (
              <p className="text-sm">{evidence.description}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{evidence.uploader_name}</span>
              <span>•</span>
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(evidence.created_at), 'MMM d, yyyy HH:mm')}</span>
            </div>
          </div>

          {/* Previous Review (if exists) */}
          {evidence.reviewed_at && evidence.reviewer_name && (
            <div className="rounded-lg border p-3 bg-primary/5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4 text-primary" />
                {t('investigation.evidence.review.previousReview', 'Previous Review')}
              </div>
              <p className="text-sm">{evidence.review_comment}</p>
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

        <DialogFooter>
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
