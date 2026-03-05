import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, Camera, MessageSquare, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface MobileChecklistItemProps {
  id: string;
  title: string;
  description?: string;
  isRequired?: boolean;
  status: 'pending' | 'pass' | 'fail' | 'na';
  comment?: string;
  photoCount?: number;
  onStatusChange: (status: 'pass' | 'fail' | 'na') => void;
  onCommentChange: (comment: string) => void;
  onPhotoCapture: () => void;
}

export function MobileChecklistItem({
  id,
  title,
  description,
  isRequired = false,
  status,
  comment = '',
  photoCount = 0,
  onStatusChange,
  onCommentChange,
  onPhotoCapture,
}: MobileChecklistItemProps) {
  const { t } = useTranslation();
  const [showComment, setShowComment] = React.useState(!!comment);

  const statusColors = {
    pending: 'border-muted-foreground/30 bg-muted/30',
    pass: 'border-green-500/50 bg-green-500/10',
    fail: 'border-destructive/50 bg-destructive/10',
    na: 'border-muted-foreground/50 bg-muted/50',
  };

  return (
    <div
      className={cn(
        'rounded-xl border-2 p-4 transition-all duration-200',
        statusColors[status]
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        <div className="flex-1">
          <h4 className="text-base font-semibold text-foreground">
            {title}
            {isRequired && <span className="text-destructive ms-1">*</span>}
          </h4>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {status === 'fail' && (
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        )}
      </div>

      {/* Action Buttons - Large touch targets */}
      <div className="flex gap-2 mb-3">
        <Button
          type="button"
          variant={status === 'pass' ? 'default' : 'outline'}
          size="lg"
          className={cn(
            'flex-1 min-h-[52px] text-base font-medium',
            status === 'pass' && 'bg-green-600 hover:bg-green-700'
          )}
          onClick={() => onStatusChange('pass')}
        >
          <Check className="me-2 h-5 w-5" />
          {t('ptw.mobile.pass', 'Pass')}
        </Button>
        <Button
          type="button"
          variant={status === 'fail' ? 'destructive' : 'outline'}
          size="lg"
          className="flex-1 min-h-[52px] text-base font-medium"
          onClick={() => onStatusChange('fail')}
        >
          <X className="me-2 h-5 w-5" />
          {t('ptw.mobile.fail', 'Fail')}
        </Button>
        <Button
          type="button"
          variant={status === 'na' ? 'secondary' : 'outline'}
          size="lg"
          className="min-h-[52px] text-base font-medium px-4"
          onClick={() => onStatusChange('na')}
        >
          {t('ptw.mobile.na', 'N/A')}
        </Button>
      </div>

      {/* Secondary Actions */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={onPhotoCapture}
        >
          <Camera className="me-2 h-4 w-4" />
          {photoCount > 0 ? `${photoCount} ${t('ptw.mobile.photos', 'photos')}` : t('ptw.mobile.addPhoto', 'Add Photo')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={() => setShowComment(!showComment)}
        >
          <MessageSquare className="me-2 h-4 w-4" />
          {t('ptw.mobile.comment', 'Comment')}
        </Button>
      </div>

      {/* Comment Field */}
      {showComment && (
        <div className="mt-3">
          <Textarea
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder={t('ptw.mobile.commentPlaceholder', 'Add your observation...')}
            rows={2}
            className="text-base"
          />
        </div>
      )}
    </div>
  );
}
