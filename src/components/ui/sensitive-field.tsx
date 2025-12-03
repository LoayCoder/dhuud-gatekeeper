import { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { logSensitiveDataAccess, SensitiveDataAccessType, partialMaskField } from '@/lib/sensitive-data-logger';

interface SensitiveFieldProps {
  value: string | null | undefined;
  canAccess: boolean;
  accessType: SensitiveDataAccessType;
  targetId?: string;
  showToggle?: boolean;
  maskType?: 'full' | 'partial';
  placeholder?: string;
  className?: string;
}

/**
 * Component to display sensitive data with access control
 * - Shows masked value by default
 * - Allows revealing if user has access
 * - Logs access attempts for audit trail
 */
export function SensitiveField({
  value,
  canAccess,
  accessType,
  targetId,
  showToggle = true,
  maskType = 'partial',
  placeholder = '—',
  className = '',
}: SensitiveFieldProps) {
  const { t } = useTranslation();
  const [isRevealed, setIsRevealed] = useState(false);

  // Reset revealed state when access changes
  useEffect(() => {
    if (!canAccess) {
      setIsRevealed(false);
    }
  }, [canAccess]);

  if (!value) {
    return <span className={`text-muted-foreground ${className}`}>{placeholder}</span>;
  }

  const getMaskedValue = () => {
    if (maskType === 'full') {
      return '••••••••';
    }
    return partialMaskField(value, false, 2, 2);
  };

  const handleReveal = async () => {
    if (!canAccess) return;
    
    const newState = !isRevealed;
    setIsRevealed(newState);
    
    // Log access when revealing
    if (newState) {
      await logSensitiveDataAccess(accessType, {
        target_user_id: targetId,
        access_granted: true,
        reason: 'User revealed sensitive field',
      });
    }
  };

  // User doesn't have access - show locked state
  if (!canAccess) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 text-muted-foreground ${className}`}>
              <Lock className="h-3 w-3" />
              <span>{getMaskedValue()}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('security.restrictedAccess')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // User has access - show with optional toggle
  if (!showToggle) {
    return <span className={className}>{value}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span>{isRevealed ? value : getMaskedValue()}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={handleReveal}
      >
        {isRevealed ? (
          <EyeOff className="h-3 w-3" />
        ) : (
          <Eye className="h-3 w-3" />
        )}
      </Button>
    </span>
  );
}
