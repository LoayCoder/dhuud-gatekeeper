import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Users } from 'lucide-react';
import { formatPrice } from '@/hooks/use-price-calculator';
import { cn } from '@/lib/utils';

interface UserCountSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  includedUsers?: number;
  pricePerUser?: number;
  disabled?: boolean;
  className?: string;
}

export function UserCountSlider({
  value,
  onChange,
  min = 1,
  max = 100,
  includedUsers = 1,
  pricePerUser = 0,
  disabled,
  className,
}: UserCountSliderProps) {
  const { t } = useTranslation();
  const extraUsers = Math.max(0, value - includedUsers);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t('subscription.numberOfUsers', 'Number of Users')}
        </CardTitle>
        <CardDescription>
          {t('subscription.usersDesc', 'Select how many users will access the platform')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Slider
            value={[value]}
            onValueChange={([v]) => onChange(v)}
            min={min}
            max={max}
            step={1}
            disabled={disabled}
            className="flex-1"
          />
          <Input
            type="number"
            value={value}
            onChange={(e) => {
              const v = parseInt(e.target.value) || min;
              onChange(Math.min(max, Math.max(min, v)));
            }}
            min={min}
            max={max}
            disabled={disabled}
            className="w-20 text-center"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <div className="space-y-1">
            <div className="text-sm">
              <span className="font-medium">{includedUsers}</span>
              <span className="text-muted-foreground ms-1">
                {t('subscription.usersIncludedInBase', 'users included in base plan')}
              </span>
            </div>
            {extraUsers > 0 && (
              <div className="text-sm">
                <span className="font-medium text-primary">{extraUsers}</span>
                <span className="text-muted-foreground ms-1">
                  {t('subscription.additionalUsersAt', 'additional users at')} {formatPrice(pricePerUser)}/{t('subscription.each', 'each')}
                </span>
              </div>
            )}
          </div>
          {extraUsers > 0 && (
            <div className="text-end">
              <span className="text-lg font-semibold text-primary">
                +{formatPrice(extraUsers * pricePerUser)}
              </span>
              <span className="text-xs text-muted-foreground block">
                /{t('subscription.month', 'month')}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
