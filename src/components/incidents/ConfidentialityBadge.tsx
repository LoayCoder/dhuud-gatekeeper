import { Lock, LockOpen, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { ConfidentialityLevel } from '@/hooks/use-incident-confidentiality';
import { cn } from '@/lib/utils';

interface ConfidentialityBadgeProps {
  level: ConfidentialityLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ConfidentialityBadge({ 
  level, 
  showLabel = true, 
  size = 'md',
  className 
}: ConfidentialityBadgeProps) {
  const { t } = useTranslation();
  
  const config = {
    public: {
      icon: LockOpen,
      label: t('confidentiality.levels.public', 'Public'),
      description: t('confidentiality.descriptions.public', 'Any authorized user can view'),
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100'
    },
    restricted: {
      icon: Lock,
      label: t('confidentiality.levels.restricted', 'Restricted'),
      description: t('confidentiality.descriptions.restricted', 'Limited to department and HSSE team'),
      variant: 'secondary' as const,
      className: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100'
    },
    confidential: {
      icon: ShieldAlert,
      label: t('confidentiality.levels.confidential', 'Confidential'),
      description: t('confidentiality.descriptions.confidential', 'HSSE Manager and explicit access only'),
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100'
    }
  };
  
  const { icon: Icon, label, description, className: badgeClassName } = config[level];
  
  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs';
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline"
          className={cn(
            badgeClassName, 
            textSize,
            'gap-1 font-medium cursor-help',
            className
          )}
        >
          <Icon className="shrink-0" size={iconSize} />
          {showLabel && <span>{label}</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
