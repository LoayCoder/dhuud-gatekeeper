import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Wifi, WifiOff } from "lucide-react";

interface Props {
  isConnected: boolean;
  newEventCount: number;
  onAcknowledge?: () => void;
}

export function LiveUpdateIndicator({ isConnected, newEventCount, onAcknowledge }: Props) {
  const { t } = useTranslation();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onAcknowledge}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md border bg-background hover:bg-muted/50 transition-colors"
          >
            {isConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {t('hsseDashboard.realtime.live', 'Live')}
                </span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {t('hsseDashboard.realtime.offline', 'Offline')}
                </span>
              </>
            )}
            {newEventCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                {newEventCount > 99 ? '99+' : newEventCount}
              </Badge>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isConnected 
              ? t('hsseDashboard.realtime.connected', 'Receiving live updates')
              : t('hsseDashboard.realtime.disconnected', 'Not connected')
            }
          </p>
          {newEventCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('hsseDashboard.realtime.newEvents', '{{count}} new events', { count: newEventCount })}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
