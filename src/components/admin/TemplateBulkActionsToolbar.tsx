import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { X, ToggleRight, ToggleLeft, Trash2, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateBulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  className?: string;
}

export function TemplateBulkActionsToolbar({
  selectedCount,
  onClearSelection,
  onActivate,
  onDeactivate,
  onDelete,
  className,
}: TemplateBulkActionsToolbarProps) {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-primary/10 border border-primary/20',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {t('templates.selectedCount', { count: selectedCount })}
        </span>

        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onActivate}
            className="gap-1.5"
          >
            <ToggleRight className="h-4 w-4" />
            {t('templates.activate')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeactivate}
            className="gap-1.5"
          >
            <ToggleLeft className="h-4 w-4" />
            {t('templates.deactivate')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {t('Delete')}
          </Button>
        </div>

        {/* Mobile dropdown */}
        <div className="sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onActivate}>
                <ToggleRight className="h-4 w-4 me-2" />
                {t('templates.activate')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDeactivate}>
                <ToggleLeft className="h-4 w-4 me-2" />
                {t('templates.deactivate')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 me-2" />
                {t('Delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="gap-1.5"
      >
        <X className="h-4 w-4" />
        <span className="hidden sm:inline">{t('Clear')}</span>
      </Button>
    </div>
  );
}
