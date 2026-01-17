/**
 * Today's Visitors Widget Component
 * Compact list of today's expected and checked-in visitors.
 */
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { User, Clock, CheckCircle, LogIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCheckInVisitor } from '@/hooks/use-visit-requests';

interface TodayVisit {
  id: string;
  visitor_id?: string;
  visitor_name?: string;
  visitor?: {
    full_name?: string;
    company_name?: string;
  };
  host_name?: string;
  scheduled_date?: string;
  checked_in_at?: string;
  checked_out_at?: string;
}

interface TodayVisitorsWidgetProps {
  visitors: TodayVisit[];
  isLoading: boolean;
  maxItems?: number;
}

export function TodayVisitorsWidget({ visitors, isLoading, maxItems = 5 }: TodayVisitorsWidgetProps) {
  const { t } = useTranslation();
  const checkIn = useCheckInVisitor();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!visitors || visitors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>{t('reception.noVisitorsExpected', 'No visitors expected today')}</p>
      </div>
    );
  }

  const displayVisitors = visitors.slice(0, maxItems);

  const getStatusBadge = (visit: TodayVisit) => {
    if (visit.checked_out_at) {
      return (
        <Badge variant="secondary" className="text-xs">
          <CheckCircle className="h-3 w-3 me-1" />
          {t('reception.departed', 'Departed')}
        </Badge>
      );
    }
    if (visit.checked_in_at) {
      return (
        <Badge className="bg-green-500 text-xs">
          <CheckCircle className="h-3 w-3 me-1" />
          {t('reception.onSite', 'On Site')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        <Clock className="h-3 w-3 me-1" />
        {t('reception.expected', 'Expected')}
      </Badge>
    );
  };

  const handleCheckIn = async (visitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await checkIn.mutateAsync(visitId);
  };

  return (
    <div className="divide-y">
      {displayVisitors.map((visit) => (
        <div 
          key={visit.id} 
          className="flex items-center justify-between py-3 hover:bg-muted/30 px-2 -mx-2 rounded transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">
                {visit.visitor?.full_name || visit.visitor_name}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                {visit.visitor?.company_name && (
                  <span>{visit.visitor.company_name}</span>
                )}
                {visit.host_name && (
                  <>
                    <span>•</span>
                    <span>{t('visitors.host', 'Host')}: {visit.host_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusBadge(visit)}
            {!visit.checked_in_at && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={(e) => handleCheckIn(visit.id, e)}
                disabled={checkIn.isPending}
              >
                <LogIn className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
      
      {visitors.length > maxItems && (
        <div className="pt-3 text-center">
          <span className="text-sm text-muted-foreground">
            {t('reception.andMore', 'and {{count}} more...', { count: visitors.length - maxItems })}
          </span>
        </div>
      )}
    </div>
  );
}
