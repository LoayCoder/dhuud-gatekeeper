import { useTranslation } from 'react-i18next';
import { useAppUpdateCheck } from '@/hooks/use-app-update-check';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AppVersionIndicatorProps {
  showUpdateBadge?: boolean;
  className?: string;
}

export function AppVersionIndicator({ 
  showUpdateBadge = true,
  className = '' 
}: AppVersionIndicatorProps) {
  const { t } = useTranslation();
  const { currentVersion, hasUpdate, newVersion, isChecking } = useAppUpdateCheck();

  if (!currentVersion && !hasUpdate) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-xs text-muted-foreground ${className}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-help">
            <Info className="h-3 w-3" />
            <span>v{currentVersion || '...'}</span>
            {isChecking && (
              <RefreshCw className="h-3 w-3 animate-spin" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{t('pwa.currentVersion')}: {currentVersion}</p>
        </TooltipContent>
      </Tooltip>
      
      {showUpdateBadge && hasUpdate && newVersion && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {t('pwa.newVersionAvailable', { version: newVersion })}
        </Badge>
      )}
    </div>
  );
}
