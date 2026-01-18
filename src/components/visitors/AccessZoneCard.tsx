/**
 * Access Zone Card
 * 
 * Displays a single zone access rule with status and controls.
 */
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, Clock, Calendar, Shield, AlertTriangle, 
  Check, X, Users, User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ZoneInfo {
  id: string;
  name: string;
  name_ar?: string;
  zone_type?: string;
  risk_level?: string;
}

interface AccessZoneCardProps {
  access: {
    id: string;
    zone_id: string;
    allowed_days?: number[] | null;
    allowed_entry_time_from?: string | null;
    allowed_entry_time_until?: string | null;
    access_level?: string | null;
    requires_induction?: boolean | null;
    valid_from?: string | null;
    valid_until?: string | null;
    zone?: ZoneInfo | null;
  };
  onRevoke: () => void;
  className?: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_AR = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export function AccessZoneCard({ access, onRevoke, className }: AccessZoneCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);

  // Check if currently accessible
  const isCurrentDayAllowed = access.allowed_days?.includes(currentDay) ?? true;
  const isTimeAllowed = 
    (!access.allowed_entry_time_from || currentTime >= access.allowed_entry_time_from) &&
    (!access.allowed_entry_time_until || currentTime <= access.allowed_entry_time_until);
  const isCurrentlyAccessible = isCurrentDayAllowed && isTimeAllowed;

  // Check validity period
  const isValidPeriod = 
    (!access.valid_from || new Date(access.valid_from) <= now) &&
    (!access.valid_until || new Date(access.valid_until) >= now);

  const dayNames = isRTL ? DAY_NAMES_AR : DAY_NAMES;
  const allowedDayNames = access.allowed_days
    ?.map(d => dayNames[d])
    .join(', ') || t('common.allDays', 'All days');

  const accessLevelLabels: Record<string, string> = {
    escort_required: t('visitors.zoneAccess.escortRequired', 'Escort Required'),
    supervised: t('visitors.zoneAccess.supervised', 'Supervised'),
    unrestricted: t('visitors.zoneAccess.unrestricted', 'Unrestricted'),
  };

  const accessLevelIcons: Record<string, React.ReactNode> = {
    escort_required: <Users className="w-4 h-4" />,
    supervised: <User className="w-4 h-4" />,
    unrestricted: <Check className="w-4 h-4" />,
  };

  return (
    <Card className={cn(
      "relative overflow-hidden",
      isCurrentlyAccessible && isValidPeriod 
        ? "border-green-500/30 bg-green-50/50 dark:bg-green-900/10"
        : "border-muted",
      className
    )}>
      {/* Status Indicator */}
      <div className={cn(
        "absolute top-0 start-0 w-1 h-full",
        isCurrentlyAccessible && isValidPeriod ? "bg-green-500" : "bg-muted"
      )} />

      <CardContent className="p-4 ps-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {/* Zone Name */}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">
                {isRTL ? (access.zone?.name_ar || access.zone?.name) : access.zone?.name}
              </span>
              {access.zone?.risk_level && (
                <Badge variant={access.zone.risk_level === 'high' ? 'destructive' : 'secondary'}>
                  {access.zone.risk_level}
                </Badge>
              )}
            </div>

            {/* Time Window */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {access.allowed_entry_time_from || '00:00'} - {access.allowed_entry_time_until || '23:59'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span className="truncate max-w-[150px]">{allowedDayNames}</span>
              </div>
            </div>

            {/* Access Level & Requirements */}
            <div className="flex flex-wrap items-center gap-2">
              {access.access_level && (
                <Badge variant="outline" className="flex items-center gap-1">
                  {accessLevelIcons[access.access_level]}
                  {accessLevelLabels[access.access_level] || access.access_level}
                </Badge>
              )}
              {access.requires_induction && (
                <Badge variant="outline" className="flex items-center gap-1 text-yellow-600 border-yellow-300">
                  <AlertTriangle className="w-3 h-3" />
                  {t('visitors.zoneAccess.inductionRequired', 'Induction Required')}
                </Badge>
              )}
            </div>

            {/* Validity Period */}
            {(access.valid_from || access.valid_until) && (
              <div className="text-xs text-muted-foreground">
                {access.valid_from && (
                  <span>{t('common.from', 'From')}: {format(new Date(access.valid_from), 'PP')}</span>
                )}
                {access.valid_from && access.valid_until && ' - '}
                {access.valid_until && (
                  <span>{t('common.until', 'Until')}: {format(new Date(access.valid_until), 'PP')}</span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2">
            {/* Status Badge */}
            <Badge 
              variant={isCurrentlyAccessible && isValidPeriod ? 'default' : 'secondary'}
              className={cn(
                isCurrentlyAccessible && isValidPeriod 
                  ? "bg-green-500 hover:bg-green-600"
                  : ""
              )}
            >
              {isCurrentlyAccessible && isValidPeriod 
                ? t('visitors.zoneAccess.accessible', 'Accessible')
                : t('visitors.zoneAccess.restricted', 'Restricted')
              }
            </Badge>

            <Button 
              variant="ghost" 
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onRevoke}
            >
              <X className="w-4 h-4 me-1" />
              {t('common.revoke', 'Revoke')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
