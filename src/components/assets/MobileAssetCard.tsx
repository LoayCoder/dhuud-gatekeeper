import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Package, ChevronLeft, ChevronRight, Calendar, AlertTriangle, Trash2, Search, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, isPast, isFuture, addDays } from 'date-fns';
import type { AssetWithRelations } from '@/hooks/use-assets';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 dark:text-green-400',
  inactive: 'bg-muted text-muted-foreground',
  under_maintenance: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  out_of_service: 'bg-red-500/10 text-red-700 dark:text-red-400',
  disposed: 'bg-muted text-muted-foreground line-through',
};

const CONDITION_COLORS: Record<string, string> = {
  excellent: 'bg-green-500/10 text-green-700 dark:text-green-400',
  good: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  fair: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  poor: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  critical: 'bg-red-500/10 text-red-700 dark:text-red-400',
};

interface MobileAssetCardProps {
  asset: AssetWithRelations;
  onInspect?: (assetId: string) => void;
  onEdit?: (assetId: string) => void;
  onDelete?: (assetId: string) => void;
}

export function MobileAssetCard({ asset, onInspect, onEdit, onDelete }: MobileAssetCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isArabic = i18n.language === 'ar';
  const isRTL = i18n.dir() === 'rtl';
  
  const [swipeX, setSwipeX] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const inspectionDue = asset.next_inspection_due ? new Date(asset.next_inspection_due) : null;
  const isOverdue = inspectionDue && isPast(inspectionDue);
  const isDueSoon = inspectionDue && !isOverdue && isFuture(inspectionDue) && inspectionDue <= addDays(new Date(), 7);

  const SWIPE_THRESHOLD = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    // Limit swipe distance
    const limitedDiff = Math.max(-150, Math.min(150, diff));
    setSwipeX(limitedDiff);
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    
    // Determine action based on swipe direction and threshold
    if (Math.abs(swipeX) > SWIPE_THRESHOLD) {
      if ((swipeX > 0 && !isRTL) || (swipeX < 0 && isRTL)) {
        // Swipe right (or left in RTL) = Inspect
        onInspect?.(asset.id);
      } else {
        // Swipe left (or right in RTL) = Delete
        onDelete?.(asset.id);
      }
    }
    
    // Reset swipe position
    setSwipeX(0);
  };

  const handleCardClick = () => {
    if (Math.abs(swipeX) < 10) {
      navigate(`/assets/${asset.id}`);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background actions revealed on swipe */}
      <div className="absolute inset-0 flex">
        {/* Left action (Inspect) */}
        <div 
          className={cn(
            'flex items-center justify-center bg-blue-500 text-white px-4',
            'transition-opacity duration-200',
            swipeX > SWIPE_THRESHOLD / 2 ? 'opacity-100' : 'opacity-50'
          )}
          style={{ width: '150px' }}
        >
          <div className="flex flex-col items-center gap-1">
            <Search className="h-5 w-5" />
            <span className="text-xs font-medium">{t('assets.mobile.swipeActions.inspect')}</span>
          </div>
        </div>
        
        <div className="flex-1" />
        
        {/* Right action (Delete) */}
        <div 
          className={cn(
            'flex items-center justify-center bg-destructive text-destructive-foreground px-4',
            'transition-opacity duration-200',
            swipeX < -SWIPE_THRESHOLD / 2 ? 'opacity-100' : 'opacity-50'
          )}
          style={{ width: '150px' }}
        >
          <div className="flex flex-col items-center gap-1">
            <Trash2 className="h-5 w-5" />
            <span className="text-xs font-medium">{t('assets.mobile.swipeActions.delete')}</span>
          </div>
        </div>
      </div>

      {/* Main card content */}
      <Card 
        ref={cardRef}
        className={cn(
          'relative cursor-pointer transition-transform touch-pan-y',
          'active:scale-[0.99]'
        )}
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-medium line-clamp-1">{asset.name}</CardTitle>
                <CardDescription className="text-sm">{asset.asset_code}</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className={cn('text-xs shrink-0', STATUS_COLORS[asset.status || 'active'])}>
              {t(`assets.status.${asset.status || 'active'}`)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{t('assets.category')}</span>
              <span className="font-medium text-foreground">
                {isArabic && asset.category?.name_ar ? asset.category.name_ar : asset.category?.name}
              </span>
            </div>
            {asset.condition_rating && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{t('assets.conditionLabel')}</span>
                <Badge variant="outline" className={cn('text-xs', CONDITION_COLORS[asset.condition_rating])}>
                  {t(`assets.conditions.${asset.condition_rating}`)}
                </Badge>
              </div>
            )}
            {inspectionDue && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {t('assets.nextInspection')}
                </span>
                <span className={cn(
                  'font-medium',
                  isOverdue && 'text-destructive',
                  isDueSoon && 'text-yellow-600 dark:text-yellow-400'
                )}>
                  {format(inspectionDue, 'MMM d, yyyy')}
                  {isOverdue && <AlertTriangle className="inline-block h-3 w-3 ms-1" />}
                </span>
              </div>
            )}
            {asset.site && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{t('assets.location')}</span>
                <span className="font-medium text-foreground truncate max-w-[140px]">
                  {asset.site.name}
                </span>
              </div>
            )}
          </div>
          
          {/* Swipe hint */}
          <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t text-xs text-muted-foreground">
            <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
            <span>{t('assets.mobile.swipeActions.inspect')}</span>
            <span className="mx-2">|</span>
            <span>{t('assets.mobile.swipeActions.delete')}</span>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
