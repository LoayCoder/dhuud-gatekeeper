import { useTranslation } from 'react-i18next';
import { X, CheckSquare, MapPin, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onStatusChange: () => void;
  onLocationChange: () => void;
  onDelete: () => void;
  className?: string;
}

export function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
  onStatusChange,
  onLocationChange,
  onDelete,
  className,
}: BulkActionsToolbarProps) {
  const { t, i18n } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
          {selectedCount}
        </span>
        <span>{t('assets.bulk.selectedCount', { count: selectedCount })}</span>
      </div>

      <div className="flex-1" />

      {/* Desktop actions */}
      <div className="hidden sm:flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onStatusChange}
          className="gap-2"
        >
          <CheckSquare className="h-4 w-4" />
          {t('assets.bulk.changeStatus')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onLocationChange}
          className="gap-2"
        >
          <MapPin className="h-4 w-4" />
          {t('assets.bulk.changeLocation')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          {t('assets.bulk.delete')}
        </Button>
      </div>

      {/* Mobile dropdown */}
      <div className="sm:hidden">
        <DropdownMenu dir={i18n.dir()}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onStatusChange}>
              <CheckSquare className="h-4 w-4 me-2" />
              {t('assets.bulk.changeStatus')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLocationChange}>
              <MapPin className="h-4 w-4 me-2" />
              {t('assets.bulk.changeLocation')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 me-2" />
              {t('assets.bulk.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onClearSelection}
        className="shrink-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
