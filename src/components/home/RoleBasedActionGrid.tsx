import { cn } from '@/lib/utils';
import { useHomeActions } from '@/hooks/use-home-actions';
import { ActionCard } from './ActionCard';
import { Skeleton } from '@/components/ui/skeleton';

interface RoleBasedActionGridProps {
  className?: string;
}

export function RoleBasedActionGrid({ className }: RoleBasedActionGridProps) {
  const { cards, isLoading } = useHomeActions();

  if (isLoading) {
    return (
      <div
        className={cn(
          'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4',
          className
        )}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="min-h-[120px] sm:min-h-[140px] rounded-xl"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-3 sm:gap-4',
        // Responsive grid: 2 cols mobile, 3 tablet, 4 desktop
        'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
        // Auto-fit rows to available space
        'auto-rows-fr',
        className
      )}
    >
      {cards.map((card) => (
        <ActionCard
          key={card.id}
          labelKey={card.labelKey}
          descriptionKey={card.descriptionKey}
          icon={card.icon}
          path={card.path}
          colorScheme={card.colorScheme}
        />
      ))}
    </div>
  );
}
