import { useState, useRef, useCallback, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const { t } = useTranslation();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  const PULL_THRESHOLD = 80;
  const MAX_PULL = 120;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0) {
      // Apply resistance to pull
      const resistance = 0.5;
      const newDistance = Math.min(MAX_PULL, diff * resistance);
      setPullDistance(newDistance);
    }
  }, [isPulling, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    setIsPulling(false);
    
    if (pullDistance > PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60); // Keep showing indicator while refreshing
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  const getStatusText = () => {
    if (isRefreshing) return t('assets.mobile.refreshing');
    if (pullDistance > PULL_THRESHOLD) return t('assets.mobile.releasing');
    return t('assets.mobile.pullToRefresh');
  };

  return (
    <div 
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div 
        className={cn(
          'absolute left-0 right-0 flex items-center justify-center transition-opacity',
          'pointer-events-none z-10',
          pullDistance > 0 ? 'opacity-100' : 'opacity-0'
        )}
        style={{ 
          top: 0,
          height: `${pullDistance}px`,
          transform: `translateY(-${pullDistance}px)`
        }}
      >
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <RefreshCw 
            className={cn(
              'h-5 w-5 transition-transform',
              isRefreshing && 'animate-spin',
              pullDistance > PULL_THRESHOLD && !isRefreshing && 'rotate-180'
            )}
          />
          <span className="text-xs">{getStatusText()}</span>
        </div>
      </div>

      {/* Content */}
      <div 
        style={{ 
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
}
