import { useTranslation } from "react-i18next";
import { format, formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { 
  LogIn, 
  LogOut, 
  MapPin, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Battery,
  Navigation,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGuardActivity, type GuardActivity, type ActivityType } from "@/hooks/use-guard-activity";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface GuardActivityTimelineProps {
  guardId: string | null;
  maxHeight?: string;
  showHeader?: boolean;
}

const activityConfig: Record<ActivityType, { 
  icon: typeof LogIn; 
  colorClass: string;
  bgClass: string;
}> = {
  check_in: { 
    icon: LogIn, 
    colorClass: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
  },
  check_out: { 
    icon: LogOut, 
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
  },
  location_update: { 
    icon: MapPin, 
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
  },
  patrol_scan: { 
    icon: Shield, 
    colorClass: 'text-primary',
    bgClass: 'bg-primary/10',
  },
  alert: { 
    icon: AlertTriangle, 
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/10',
  },
};

function getActivityStyles(activity: GuardActivity) {
  const config = activityConfig[activity.type];
  
  // Override for severity
  if (activity.severity === 'critical') {
    return {
      ...config,
      colorClass: 'text-destructive',
      bgClass: 'bg-destructive/10',
    };
  }
  if (activity.severity === 'warning') {
    return {
      ...config,
      colorClass: 'text-yellow-600 dark:text-yellow-400',
      bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    };
  }
  if (activity.severity === 'success') {
    return {
      ...config,
      colorClass: 'text-green-600 dark:text-green-400',
      bgClass: 'bg-green-100 dark:bg-green-900/30',
    };
  }
  
  return config;
}

export function GuardActivityTimeline({ 
  guardId, 
  maxHeight = "400px",
  showHeader = true,
}: GuardActivityTimelineProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const locale = isRTL ? ar : enUS;
  
  const { data: activities, isLoading, error } = useGuardActivity(guardId);

  if (!guardId) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Navigation className="h-5 w-5 me-2" />
        <span>{isRTL ? 'اختر حارساً لعرض النشاط' : 'Select a guard to view activity'}</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-destructive">
        <AlertTriangle className="h-5 w-5 me-2" />
        <span>{isRTL ? 'خطأ في تحميل النشاط' : 'Error loading activity'}</span>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mb-2" />
        <span>{isRTL ? 'لا يوجد نشاط في آخر 24 ساعة' : 'No activity in the last 24 hours'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showHeader && (
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-medium">
            {isRTL ? 'سجل النشاط' : 'Activity Timeline'}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {activities.length} {isRTL ? 'نشاط' : 'activities'}
          </Badge>
        </div>
      )}
      
      <ScrollArea style={{ maxHeight }} className="pe-2">
        <div className="relative">
          {/* Timeline line */}
          <div className={cn(
            "absolute top-0 bottom-0 w-0.5 bg-border",
            isRTL ? "end-3" : "start-3"
          )} />
          
          <div className="space-y-3">
            {activities.map((activity, index) => {
              const styles = getActivityStyles(activity);
              const Icon = styles.icon;
              const timestamp = new Date(activity.timestamp);
              
              return (
                <div 
                  key={activity.id}
                  className={cn(
                    "relative flex gap-3",
                    isRTL && "flex-row-reverse"
                  )}
                >
                  {/* Icon bubble */}
                  <div className={cn(
                    "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    styles.bgClass
                  )}>
                    <Icon className={cn("h-3.5 w-3.5", styles.colorClass)} />
                  </div>
                  
                  {/* Content */}
                  <div className={cn(
                    "flex-1 min-w-0 pb-3",
                    index === activities.length - 1 && "pb-0"
                  )}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={cn(
                          "text-sm font-medium leading-tight",
                          styles.colorClass
                        )}>
                          {isRTL ? activity.titleAr : activity.title}
                        </p>
                        {activity.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {isRTL ? (activity.descriptionAr || activity.description) : activity.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="shrink-0 text-end">
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(timestamp, { addSuffix: true, locale })}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70">
                          {format(timestamp, 'HH:mm', { locale })}
                        </p>
                      </div>
                    </div>
                    
                    {/* Alert status badges */}
                    {activity.type === 'alert' && activity.metadata && (
                      <div className="flex gap-1 mt-1">
                        {activity.metadata.resolved ? (
                          <Badge variant="outline" className="text-[10px] h-4 text-green-600 border-green-200">
                            <CheckCircle2 className="h-2.5 w-2.5 me-1" />
                            {isRTL ? 'تم الحل' : 'Resolved'}
                          </Badge>
                        ) : activity.metadata.acknowledged ? (
                          <Badge variant="outline" className="text-[10px] h-4 text-blue-600 border-blue-200">
                            <CheckCircle2 className="h-2.5 w-2.5 me-1" />
                            {isRTL ? 'تم الإقرار' : 'Acknowledged'}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] h-4">
                            {isRTL ? 'معلق' : 'Pending'}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Battery indicator for location updates */}
                    {activity.type === 'location_update' && activity.metadata?.battery && (
                      <div className="flex items-center gap-1 mt-1">
                        <Battery className={cn(
                          "h-3 w-3",
                          (activity.metadata.battery as number) < 20 ? "text-destructive" : "text-muted-foreground"
                        )} />
                        <span className="text-[10px] text-muted-foreground">
                          {String(activity.metadata.battery)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
