import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHSEMessages } from '@/hooks/use-hse-messages';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi
} from '@/components/ui/carousel';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, AlertTriangle, CheckCircle, Info, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
};

const colorSchemeMap = {
  info: {
    bg: 'bg-info/10',
    border: 'border-info/30',
    icon: 'text-info',
    gradient: 'from-info/20 to-info/5',
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    icon: 'text-warning',
    gradient: 'from-warning/20 to-warning/5',
  },
  success: {
    bg: 'bg-success/10',
    border: 'border-success/30',
    icon: 'text-success',
    gradient: 'from-success/20 to-success/5',
  },
  danger: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    icon: 'text-destructive',
    gradient: 'from-destructive/20 to-destructive/5',
  },
};

export function HSEMessageCarousel() {
  const { t, i18n } = useTranslation();
  const { data: messages, isLoading } = useHSEMessages();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const isArabic = i18n.language === 'ar';

  // Auto-rotate every 10 seconds
  useEffect(() => {
    if (!api || !messages?.length) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 10000);

    return () => clearInterval(interval);
  }, [api, messages?.length]);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());
    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  if (isLoading) {
    return (
      <Skeleton className="h-32 w-full rounded-xl" />
    );
  }

  if (!messages?.length) {
    // Default safety message when no messages configured
    return (
      <Card className="overflow-hidden border-success/30 bg-gradient-to-r from-success/10 to-success/5">
        <CardContent className="flex items-center gap-4 py-4 px-5">
          <div className="p-3 rounded-xl bg-success/20 shrink-0">
            <Shield className="h-6 w-6 text-success" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-base">
              {t('dashboard.hse.defaultTitle', 'Safety First!')}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {t('dashboard.hse.defaultMessage', 'Your safety is our priority. Report any hazards or observations to keep everyone safe.')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      <Carousel
        setApi={setApi}
        opts={{ loop: true, direction: isArabic ? 'rtl' : 'ltr' }}
        className="w-full"
      >
        <CarouselContent>
          {messages.map((msg) => {
            const Icon = iconMap[msg.icon_name || 'Shield'] || Shield;
            const colors = colorSchemeMap[msg.color_scheme] || colorSchemeMap.info;

            return (
              <CarouselItem key={msg.id}>
                <Card className={cn(
                  'overflow-hidden border',
                  colors.border,
                  `bg-gradient-to-r ${colors.gradient}`
                )}>
                  <CardContent className="flex items-center gap-4 py-4 px-5">
                    <div className={cn('p-3 rounded-xl shrink-0', colors.bg)}>
                      <Icon className={cn('h-6 w-6', colors.icon)} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base">
                        {msg.displayTitle}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {msg.displayMessage}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {messages.length > 1 && (
          <>
            <CarouselPrevious className="hidden md:flex -start-3 h-8 w-8" />
            <CarouselNext className="hidden md:flex -end-3 h-8 w-8" />
          </>
        )}
      </Carousel>

      {/* Indicators */}
      {messages.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {messages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => api?.scrollTo(idx)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                idx === current
                  ? 'w-6 bg-primary'
                  : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}