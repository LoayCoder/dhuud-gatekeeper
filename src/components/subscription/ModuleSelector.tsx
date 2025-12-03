import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield, Users, AlertTriangle, ClipboardCheck, BarChart3, Code, 
  Package, LucideIcon 
} from 'lucide-react';
import { formatPrice, type Module } from '@/hooks/use-price-calculator';
import { cn } from '@/lib/utils';

// Icon mapping for modules
const iconMap: Record<string, LucideIcon> = {
  Shield,
  Users,
  AlertTriangle,
  ClipboardCheck,
  BarChart3,
  Code,
  Package,
};

interface ModuleSelectorProps {
  modules: Module[];
  selectedModuleIds: string[];
  onToggle: (moduleId: string) => void;
  includedModuleIds?: string[];
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ModuleSelector({
  modules,
  selectedModuleIds,
  onToggle,
  includedModuleIds = [],
  isLoading,
  disabled,
  className,
}: ModuleSelectorProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{t('subscription.selectModules', 'Select Modules')}</CardTitle>
          <CardDescription>
            {t('subscription.selectModulesDesc', 'Choose the features your organization needs')}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {t('subscription.selectModules', 'Select Modules')}
        </CardTitle>
        <CardDescription>
          {t('subscription.selectModulesDesc', 'Choose the features your organization needs')}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {modules.map(module => {
          const isIncluded = includedModuleIds.includes(module.id);
          const isSelected = selectedModuleIds.includes(module.id);
          const IconComponent = iconMap[module.icon || 'Package'] || Package;

          return (
            <div
              key={module.id}
              className={cn(
                "flex items-start gap-4 rounded-lg border p-4 transition-colors",
                isSelected && !isIncluded && "border-primary bg-primary/5",
                isIncluded && "border-green-500/50 bg-green-500/5",
                !isSelected && !isIncluded && "hover:border-muted-foreground/30"
              )}
            >
              <Checkbox
                id={module.id}
                checked={isSelected || isIncluded}
                disabled={disabled || isIncluded}
                onCheckedChange={() => !isIncluded && onToggle(module.id)}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-4 w-4 text-primary" />
                  <label
                    htmlFor={module.id}
                    className={cn(
                      "font-medium cursor-pointer",
                      (disabled || isIncluded) && "cursor-default"
                    )}
                  >
                    {module.name}
                  </label>
                  {isIncluded && (
                    <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                      {t('subscription.includedInPlan', 'Included')}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {module.description}
                </p>
              </div>
              <div className="text-end">
                {isIncluded ? (
                  <span className="text-sm font-medium text-green-600">
                    {t('subscription.free', 'Free')}
                  </span>
                ) : module.base_price_monthly > 0 ? (
                  <>
                    <span className="text-sm font-medium">
                      {formatPrice(module.base_price_monthly)}
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      /{t('subscription.month', 'month')}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-medium text-green-600">
                    {t('subscription.free', 'Free')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
