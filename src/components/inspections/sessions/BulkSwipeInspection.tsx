import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle, XCircle, SkipForward, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { SwipeInspectionItem } from './SwipeInspectionItem';
import { useSaveAreaResponse, type AreaInspectionResponse } from '@/hooks/use-area-inspections';
import type { TemplateItem } from '@/hooks/use-inspections';
import { cn } from '@/lib/utils';

interface BulkSwipeInspectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: TemplateItem[];
  responses: AreaInspectionResponse[];
  sessionId: string;
  isLocked: boolean;
}

export function BulkSwipeInspection({
  open,
  onOpenChange,
  items,
  responses,
  sessionId,
  isLocked,
}: BulkSwipeInspectionProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [pendingFailItem, setPendingFailItem] = useState<TemplateItem | null>(null);
  const [failComment, setFailComment] = useState('');
  
  const saveResponse = useSaveAreaResponse();
  
  // Create response map for quick lookup
  const responseMap = useMemo(() => {
    return new Map(responses.map(r => [r.template_item_id, r]));
  }, [responses]);
  
  // Filter to only pass_fail and yes_no items for swipe mode
  const swipeableItems = useMemo(() => {
    return items.filter(item => 
      item.response_type === 'pass_fail' || item.response_type === 'yes_no'
    );
  }, [items]);
  
  // Calculate progress
  const completedCount = useMemo(() => {
    return swipeableItems.filter(item => responseMap.has(item.id)).length;
  }, [swipeableItems, responseMap]);
  
  const progressPercent = swipeableItems.length > 0 
    ? Math.round((completedCount / swipeableItems.length) * 100) 
    : 0;
  
  const currentItem = swipeableItems[currentIndex];
  const currentResponse = currentItem ? responseMap.get(currentItem.id) : undefined;
  
  const handleResult = useCallback(async (result: 'pass' | 'fail' | 'na') => {
    if (!currentItem || isLocked) return;
    
    // For fail results, show comment dialog
    if (result === 'fail') {
      setPendingFailItem(currentItem);
      setFailComment('');
      setShowCommentDialog(true);
      return;
    }
    
    // Save the result
    try {
      await saveResponse.mutateAsync({
        session_id: sessionId,
        template_item_id: currentItem.id,
        result,
      });
      
      // Show feedback
      if (result === 'pass') {
        toast.success(t('inspections.markedPass'), { duration: 1000 });
      } else if (result === 'na') {
        toast.info(t('inspections.markedNA'), { duration: 1000 });
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  }, [currentItem, sessionId, isLocked, saveResponse, t]);
  
  const handleFailWithComment = useCallback(async () => {
    if (!pendingFailItem) return;
    
    try {
      await saveResponse.mutateAsync({
        session_id: sessionId,
        template_item_id: pendingFailItem.id,
        result: 'fail',
        notes: failComment || undefined,
      });
      
      toast.error(t('inspections.markedFail'), { duration: 1000 });
      setShowCommentDialog(false);
      setPendingFailItem(null);
      setFailComment('');
      
      // Don't auto-advance, let user add photos or more notes if needed
    } catch (error: any) {
      toast.error(error.message);
    }
  }, [pendingFailItem, sessionId, failComment, saveResponse, t]);
  
  const handleNext = useCallback(() => {
    if (currentIndex < swipeableItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, swipeableItems.length]);
  
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);
  
  const handleSkipToUnanswered = useCallback(() => {
    const unansweredIndex = swipeableItems.findIndex(item => !responseMap.has(item.id));
    if (unansweredIndex !== -1) {
      setCurrentIndex(unansweredIndex);
    } else {
      toast.info(t('inspections.allItemsAnswered'));
    }
  }, [swipeableItems, responseMap, t]);
  
  if (swipeableItems.length === 0) {
    return null;
  }
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-lg h-[85vh] p-0 flex flex-col"
          dir={direction}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex-1">
              <h2 className="font-semibold">{t('inspections.bulkSwipeMode')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('inspections.swipeToInspect')}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Progress bar */}
          <div className="px-4 py-2 border-b">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>{t('inspections.completed')}: {completedCount}/{swipeableItems.length}</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          
          {/* Quick actions */}
          <div className="flex gap-2 px-4 py-2 border-b bg-muted/30">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkipToUnanswered}
              className="text-xs"
            >
              <SkipForward className="h-3 w-3 me-1" />
              {t('inspections.skipToUnanswered')}
            </Button>
          </div>
          
          {/* Swipe area */}
          <div className="flex-1 overflow-hidden">
            {currentItem && (
              <SwipeInspectionItem
                item={currentItem}
                response={currentResponse}
                onResult={handleResult}
                onNext={handleNext}
                onPrevious={handlePrevious}
                currentIndex={currentIndex}
                totalItems={swipeableItems.length}
                isLocked={isLocked}
              />
            )}
          </div>
          
          {/* Stats footer */}
          <div className="flex justify-around p-3 border-t bg-muted/30 text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>
                {responses.filter(r => r.result === 'pass').length}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>
                {responses.filter(r => r.result === 'fail').length}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              {t('inspections.pending')}: {swipeableItems.length - completedCount}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Comment dialog for failed items */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent dir={direction}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              {t('inspections.addFailComment')}
            </DialogTitle>
            <DialogDescription>
              {pendingFailItem?.question}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('inspections.commentOptional')}</Label>
              <Textarea
                value={failComment}
                onChange={(e) => setFailComment(e.target.value)}
                placeholder={t('inspections.describeIssue')}
                rows={3}
                autoFocus
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCommentDialog(false);
                setPendingFailItem(null);
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive"
              onClick={handleFailWithComment}
              disabled={saveResponse.isPending}
            >
              <XCircle className="h-4 w-4 me-2" />
              {t('inspections.markAsFail')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
