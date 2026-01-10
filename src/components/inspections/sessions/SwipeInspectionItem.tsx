import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle, 
  XCircle, 
  MinusCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TemplateItem } from '@/hooks/use-inspections';
import type { AreaInspectionResponse } from '@/hooks/use-area-inspections';

interface SwipeInspectionItemProps {
  item: TemplateItem;
  response?: AreaInspectionResponse;
  onResult: (result: 'pass' | 'fail' | 'na') => void;
  onNext: () => void;
  onPrevious: () => void;
  currentIndex: number;
  totalItems: number;
  isLocked: boolean;
}

export function SwipeInspectionItem({
  item,
  response,
  onResult,
  onNext,
  onPrevious,
  currentIndex,
  totalItems,
  isLocked,
}: SwipeInspectionItemProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const isRTL = direction === 'rtl';
  
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeAction, setSwipeAction] = useState<'pass' | 'fail' | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef(false);
  
  const SWIPE_THRESHOLD = 100;
  const ACTION_THRESHOLD = 50;
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isLocked) return;
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    isHorizontalSwipe.current = false;
    setIsDragging(true);
  }, [isLocked]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isLocked || !isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    
    // Determine if this is a horizontal swipe on first significant movement
    if (!isHorizontalSwipe.current && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
    }
    
    // Only handle horizontal swipes
    if (!isHorizontalSwipe.current) return;
    
    e.preventDefault();
    
    // In RTL, reverse the swipe direction
    const adjustedDelta = isRTL ? -deltaX : deltaX;
    setSwipeOffset(adjustedDelta);
    
    // Determine visual feedback action
    if (adjustedDelta > ACTION_THRESHOLD) {
      setSwipeAction('pass');
    } else if (adjustedDelta < -ACTION_THRESHOLD) {
      setSwipeAction('fail');
    } else {
      setSwipeAction(null);
    }
  }, [isLocked, isDragging, isRTL]);
  
  const handleTouchEnd = useCallback(() => {
    if (isLocked) return;
    
    setIsDragging(false);
    
    // Trigger action if threshold met
    if (swipeOffset > SWIPE_THRESHOLD) {
      onResult('pass');
      // Auto-advance after short delay
      setTimeout(onNext, 300);
    } else if (swipeOffset < -SWIPE_THRESHOLD) {
      onResult('fail');
      // Don't auto-advance on fail - may need to add notes
    }
    
    // Reset swipe state
    setSwipeOffset(0);
    setSwipeAction(null);
  }, [swipeOffset, onResult, onNext, isLocked]);
  
  // Get question text based on language
  const questionText = i18n.language === 'ar' && item.question_ar ? item.question_ar : item.question;
  const instructionsText = i18n.language === 'ar' && item.instructions_ar ? item.instructions_ar : item.instructions;
  
  // Current result
  const currentResult = response?.result || null;
  
  // Calculate background color based on swipe
  const getSwipeBackground = () => {
    if (swipeAction === 'pass') return 'bg-green-500/20';
    if (swipeAction === 'fail') return 'bg-red-500/20';
    return '';
  };
  
  return (
    <div className="relative h-full flex flex-col" dir={direction}>
      {/* Progress indicator */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <span className="text-sm font-medium">
          {t('inspections.itemOf', { current: currentIndex + 1, total: totalItems })}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: Math.min(totalItems, 10) }).map((_, i) => {
            const itemIndex = Math.floor(currentIndex / 10) * 10 + i;
            if (itemIndex >= totalItems) return null;
            return (
              <div
                key={i}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  itemIndex === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
            );
          })}
        </div>
      </div>
      
      {/* Swipe hints */}
      <div className="absolute inset-y-0 start-0 w-16 flex items-center justify-center pointer-events-none z-10">
        <div className={cn(
          'p-3 rounded-full transition-all',
          swipeAction === 'pass' ? 'bg-green-500 scale-110' : 'bg-muted/50',
        )}>
          <CheckCircle className={cn(
            'h-8 w-8',
            swipeAction === 'pass' ? 'text-white' : 'text-green-600'
          )} />
        </div>
      </div>
      
      <div className="absolute inset-y-0 end-0 w-16 flex items-center justify-center pointer-events-none z-10">
        <div className={cn(
          'p-3 rounded-full transition-all',
          swipeAction === 'fail' ? 'bg-red-500 scale-110' : 'bg-muted/50',
        )}>
          <XCircle className={cn(
            'h-8 w-8',
            swipeAction === 'fail' ? 'text-white' : 'text-red-600'
          )} />
        </div>
      </div>
      
      {/* Main swipeable card */}
      <div
        ref={containerRef}
        className={cn(
          'flex-1 overflow-hidden touch-pan-y',
          getSwipeBackground(),
          'transition-colors duration-150'
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={cn(
            'h-full p-6 flex flex-col',
            isDragging ? '' : 'transition-transform duration-300'
          )}
          style={{
            transform: `translateX(${swipeOffset}px)`,
          }}
        >
          {/* Question badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {item.is_critical && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 me-1" />
                {t('inspections.critical')}
              </Badge>
            )}
            {item.is_required && (
              <Badge variant="secondary">
                {t('inspections.required')}
              </Badge>
            )}
            {currentResult && (
              <Badge 
                variant="outline"
                className={cn(
                  currentResult === 'pass' && 'border-green-500 text-green-600 bg-green-500/10',
                  currentResult === 'fail' && 'border-red-500 text-red-600 bg-red-500/10',
                  currentResult === 'na' && 'border-muted-foreground'
                )}
              >
                {currentResult === 'pass' && <CheckCircle className="h-3 w-3 me-1" />}
                {currentResult === 'fail' && <XCircle className="h-3 w-3 me-1" />}
                {currentResult === 'na' && <MinusCircle className="h-3 w-3 me-1" />}
                {t(`inspections.results.${currentResult}`)}
              </Badge>
            )}
          </div>
          
          {/* Question text */}
          <h2 className="text-xl font-semibold mb-3">{questionText}</h2>
          
          {instructionsText && (
            <p className="text-muted-foreground mb-4">{instructionsText}</p>
          )}
          
          {/* Swipe instructions */}
          <div className="mt-auto pt-8 text-center text-muted-foreground text-sm space-y-2">
            <p className="flex items-center justify-center gap-2">
              <ChevronRight className="h-4 w-4 text-green-600 rtl:rotate-180" />
              {t('inspections.swipeRightPass')}
            </p>
            <p className="flex items-center justify-center gap-2">
              <ChevronLeft className="h-4 w-4 text-red-600 rtl:rotate-180" />
              {t('inspections.swipeLeftFail')}
            </p>
          </div>
        </div>
      </div>
      
      {/* Bottom action buttons */}
      <div className="flex gap-2 p-4 border-t bg-background">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onPrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 me-1 rtl:rotate-180" />
          {t('common.previous')}
        </Button>
        
        <Button
          variant="outline"
          onClick={() => onResult('na')}
          disabled={isLocked}
        >
          <MinusCircle className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          className="flex-1"
          onClick={onNext}
          disabled={currentIndex === totalItems - 1}
        >
          {t('common.next')}
          <ChevronRight className="h-4 w-4 ms-1 rtl:rotate-180" />
        </Button>
      </div>
    </div>
  );
}
