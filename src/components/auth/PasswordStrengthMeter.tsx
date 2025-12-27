import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePasswordStrength, PasswordStrengthResult } from '@/hooks/use-password-strength';

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
  className?: string;
}

export function PasswordStrengthMeter({ 
  password, 
  showRequirements = true,
  className 
}: PasswordStrengthMeterProps) {
  const { t } = useTranslation();
  const strength = usePasswordStrength(password);

  if (!password) return null;

  const levelColors: Record<PasswordStrengthResult['level'], string> = {
    weak: 'bg-destructive',
    fair: 'bg-yellow-500',
    good: 'bg-blue-500',
    strong: 'bg-green-500',
  };

  const levelLabels: Record<PasswordStrengthResult['level'], string> = {
    weak: t('passwordStrength.weak'),
    fair: t('passwordStrength.fair'),
    good: t('passwordStrength.good'),
    strong: t('passwordStrength.strong'),
  };

  const levelTextColors: Record<PasswordStrengthResult['level'], string> = {
    weak: 'text-destructive',
    fair: 'text-yellow-600 dark:text-yellow-400',
    good: 'text-blue-600 dark:text-blue-400',
    strong: 'text-green-600 dark:text-green-400',
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('passwordStrength.title')}</span>
          <span className={cn('font-medium', levelTextColors[strength.level])}>
            {levelLabels[strength.level]}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full transition-all duration-300', levelColors[strength.level])}
            style={{ width: `${strength.score}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-1.5">
          {strength.requirements.map((req) => (
            <div
              key={req.key}
              className={cn(
                'flex items-center gap-2 text-sm transition-colors',
                req.met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
              )}
            >
              {req.met ? (
                <Check className="h-4 w-4 flex-shrink-0" />
              ) : (
                <X className="h-4 w-4 flex-shrink-0" />
              )}
              <span>{t(req.label)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
