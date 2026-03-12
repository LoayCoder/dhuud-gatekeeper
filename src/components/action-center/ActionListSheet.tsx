import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface ActionListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  badge?: number;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  children: React.ReactNode;
}

export function ActionListSheet({
  open,
  onOpenChange,
  title,
  description,
  badge,
  badgeVariant = 'secondary',
  children,
}: ActionListSheetProps) {
  const { i18n } = useTranslation();
  const direction = i18n.dir();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={direction === 'rtl' ? 'left' : 'right'}
        className="w-full sm:max-w-xl flex flex-col p-0 pb-[env(safe-area-inset-bottom)]"
        dir={direction}
      >
        <SheetHeader className="px-4 pt-6 pb-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-lg">{title}</SheetTitle>
            {badge !== undefined && badge > 0 && (
              <Badge variant={badgeVariant} className="text-xs">
                {badge}
              </Badge>
            )}
          </div>
          {description && (
            <SheetDescription className="text-xs">{description}</SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3" style={{ WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
