import React from 'react';
import { LucideIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TYPOGRAPHY } from '@/styles/design-tokens';

/**
 * SectionHeader - Consistent section headers with optional actions
 * 
 * Features:
 * - Clear hierarchy (h2/h3 levels)
 * - Optional action button
 * - Consistent spacing
 * - Collapsible support
 */

interface SectionHeaderAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
}

interface SectionHeaderProps {
  /** Section title */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Badge count or text */
  badge?: string | number;
  /** Badge variant */
  badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
  /** Action button */
  action?: SectionHeaderAction;
  /** Additional actions */
  secondaryActions?: SectionHeaderAction[];
  /** Heading level */
  level?: 'h2' | 'h3' | 'h4';
  /** Make section collapsible */
  collapsible?: boolean;
  /** Collapsed state (controlled) */
  isCollapsed?: boolean;
  /** Toggle collapsed callback */
  onToggleCollapse?: () => void;
  /** Additional className */
  className?: string;
  /** Children content (for collapsible sections) */
  children?: React.ReactNode;
}

export function SectionHeader({
  title,
  description,
  icon: Icon,
  badge,
  badgeVariant = 'secondary',
  action,
  secondaryActions,
  level = 'h2',
  collapsible = false,
  isCollapsed = false,
  onToggleCollapse,
  className,
  children,
}: SectionHeaderProps) {
  const HeadingTag = level;
  
  const headingClasses = cn(
    level === 'h2' && TYPOGRAPHY.sectionTitle,
    level === 'h3' && 'text-base font-medium',
    level === 'h4' && TYPOGRAPHY.cardTitle
  );

  const headerContent = (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {Icon && (
          <div className="flex-shrink-0 p-1.5 rounded-md bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <HeadingTag className={cn(headingClasses, 'truncate')}>
              {title}
            </HeadingTag>
            {badge !== undefined && (
              <Badge variant={badgeVariant} className="flex-shrink-0">
                {badge}
              </Badge>
            )}
          </div>
          {description && (
            <p className={cn(TYPOGRAPHY.helper, 'mt-0.5 line-clamp-1')}>
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {secondaryActions?.map((secondaryAction, index) => {
          const ActionIcon = secondaryAction.icon;
          return (
            <Button
              key={index}
              variant={secondaryAction.variant || 'ghost'}
              size="sm"
              onClick={secondaryAction.onClick}
            >
              {ActionIcon && <ActionIcon className="h-4 w-4 me-1" />}
              <span className="hidden sm:inline">{secondaryAction.label}</span>
            </Button>
          );
        })}
        
        {action && (
          <Button
            variant={action.variant || 'outline'}
            size="sm"
            onClick={action.onClick}
          >
            {action.icon && <action.icon className="h-4 w-4 me-1" />}
            {action.label}
          </Button>
        )}

        {collapsible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="flex-shrink-0"
          >
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );

  if (collapsible && children) {
    return (
      <div>
        {headerContent}
        {!isCollapsed && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>
    );
  }

  return headerContent;
}

/**
 * CollapsibleSection - Section with built-in collapse state
 */
interface CollapsibleSectionProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string | number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  description,
  icon,
  badge,
  defaultExpanded = true,
  children,
  className,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div className={className}>
      <SectionHeader
        title={title}
        description={description}
        icon={icon}
        badge={badge}
        collapsible
        isCollapsed={!isExpanded}
        onToggleCollapse={() => setIsExpanded(!isExpanded)}
      >
        {children}
      </SectionHeader>
    </div>
  );
}

export default SectionHeader;
