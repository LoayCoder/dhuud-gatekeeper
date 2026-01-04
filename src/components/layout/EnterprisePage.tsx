import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { TYPOGRAPHY, SPACING } from '@/styles/design-tokens';
import { cn } from '@/lib/utils';

/**
 * EnterprisePage - Standardized page wrapper for all HSSE pages
 * 
 * Structure:
 * +------------------------------------------+
 * |  Header Section                           |
 * |  - Title + Description                    |
 * |  - Primary Action Button (end-aligned)   |
 * +------------------------------------------+
 * |  Summary Section (optional)               |
 * |  - KPI blocks or status summary          |
 * +------------------------------------------+
 * |  Main Content                             |
 * |  - Structured cards/blocks               |
 * +------------------------------------------+
 * |  Action Section (optional)                |
 * |  - Clear next steps                      |
 * +------------------------------------------+
 */

interface PageAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  disabled?: boolean;
}

interface EnterprisePageProps {
  /** Page title */
  title: string;
  /** One-line purpose description */
  description?: string;
  /** Primary action button (right aligned) */
  primaryAction?: PageAction;
  /** Secondary actions */
  secondaryActions?: PageAction[];
  /** Summary section content (KPIs, status blocks) */
  summarySection?: React.ReactNode;
  /** Main content */
  children: React.ReactNode;
  /** Action section at bottom */
  actionSection?: React.ReactNode;
  /** Additional className for the page container */
  className?: string;
  /** Icon for the page title */
  titleIcon?: LucideIcon;
  /** Loading state */
  isLoading?: boolean;
}

export function EnterprisePage({
  title,
  description,
  primaryAction,
  secondaryActions,
  summarySection,
  children,
  actionSection,
  className,
  titleIcon: TitleIcon,
  isLoading = false,
}: EnterprisePageProps) {
  return (
    <div className={cn(SPACING.page, 'min-h-full', className)}>
      {/* Header Section */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            {TitleIcon && (
              <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
                <TitleIcon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className={cn(TYPOGRAPHY.pageTitle, 'truncate')}>{title}</h1>
              {description && (
                <p className={cn(TYPOGRAPHY.helper, 'mt-1 line-clamp-2')}>
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {(primaryAction || secondaryActions) && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {secondaryActions?.map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  onClick={action.onClick}
                  disabled={action.disabled || isLoading}
                  size="sm"
                >
                  {ActionIcon && <ActionIcon className="h-4 w-4 me-2 rtl:rotate-0" />}
                  {action.label}
                </Button>
              );
            })}
            {primaryAction && (
              <Button
                variant={primaryAction.variant || 'default'}
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled || isLoading}
                size="sm"
              >
                {primaryAction.icon && (
                  <primaryAction.icon className="h-4 w-4 me-2 rtl:rotate-0" />
                )}
                {primaryAction.label}
              </Button>
            )}
          </div>
        )}
      </header>

      {/* Summary Section */}
      {summarySection && (
        <section className="mb-6" aria-label="Summary">
          {summarySection}
        </section>
      )}

      {/* Main Content */}
      <main className={SPACING.section}>
        {children}
      </main>

      {/* Action Section */}
      {actionSection && (
        <footer className="mt-6 pt-6 border-t" aria-label="Actions">
          {actionSection}
        </footer>
      )}
    </div>
  );
}

export default EnterprisePage;
