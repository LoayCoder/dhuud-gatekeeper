import { useNavigate } from 'react-router-dom';
import { LucideIcon, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export interface ActionLink {
  label: string;
  href: string;
  icon?: LucideIcon;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  badge?: number;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  /** Roles that can see this action */
  requiredRoles?: string[];
  /** Whether to show only when badge > 0 */
  showOnlyWithBadge?: boolean;
}

export interface ModuleKPI {
  label: string;
  value: number;
  colorClass?: string;
}

interface ActionModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColorClass?: string;
  actionLinks: ActionLink[];
  kpis?: ModuleKPI[];
  /** Total attention-needed items for module badge */
  attentionCount?: number;
  /** Whether the module has critical items */
  hasCritical?: boolean;
  /** Default expanded state */
  defaultExpanded?: boolean;
}

export function ActionModuleCard({
  title,
  description,
  icon: Icon,
  iconColorClass = 'text-primary',
  actionLinks,
  kpis,
  attentionCount = 0,
  hasCritical = false,
  defaultExpanded = true,
}: ActionModuleCardProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const visibleLinks = actionLinks.filter(
    link => !link.showOnlyWithBadge || (link.badge && link.badge > 0)
  );

  return (
    <Card className={cn(
      'transition-all hover:shadow-md',
      hasCritical && 'border-destructive/40',
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn(
              'flex-shrink-0 p-2 rounded-lg',
              hasCritical ? 'bg-destructive/10' : 'bg-primary/10',
            )}>
              <Icon className={cn('h-5 w-5', hasCritical ? 'text-destructive' : iconColorClass)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold truncate">{title}</CardTitle>
                {attentionCount > 0 && (
                  <Badge variant={hasCritical ? 'destructive' : 'secondary'} className="flex-shrink-0">
                    {attentionCount}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 h-8 w-8 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0 space-y-3">
          {/* KPI Strip */}
          {kpis && kpis.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-md border bg-muted/30 px-3 py-2 text-center">
                  <div className={cn('text-lg font-bold tabular-nums', kpi.colorClass || 'text-foreground')}>
                    {kpi.value}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    {kpi.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Links */}
          <div className="flex flex-wrap gap-2">
            {visibleLinks.map((link) => {
              const LinkIcon = link.icon;
              return (
                <Button
                  key={link.href + link.label}
                  variant={link.variant || 'outline'}
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => navigate(link.href)}
                >
                  {LinkIcon && <LinkIcon className="h-3.5 w-3.5" />}
                  {link.label}
                  {link.badge !== undefined && link.badge > 0 && (
                    <Badge
                      variant={link.badgeVariant || 'secondary'}
                      className="h-4 min-w-4 px-1 text-[10px] leading-none"
                    >
                      {link.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
