import { useTranslation } from "react-i18next";
import { User, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyManager } from "@/hooks/use-my-manager";
import { Skeleton } from "@/components/ui/skeleton";

// Content-only version for use with ProfileCollapsibleCard
export function ManagerInfoContent() {
  const { t } = useTranslation();
  const { data: manager, isLoading } = useMyManager();

  if (isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  if (!manager) {
    return (
      <p className="text-xs text-muted-foreground">
        {t('profile.noManagerAssigned', 'No manager assigned')}
      </p>
    );
  }

  return (
    <div className="rounded-md border p-2.5 sm:p-3 bg-muted/10 space-y-2.5">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-primary/10 rounded-full shrink-0">
          <User className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-xs sm:text-sm">{manager?.full_name || t('common.unknown')}</p>
          {manager?.job_title && (
            <p className="text-[10px] sm:text-xs text-muted-foreground">{manager.job_title}</p>
          )}
        </div>
      </div>
      
      {/* Contact buttons */}
      <div className="flex gap-1.5 flex-wrap">
        {manager?.phone_number && (
          <Button asChild variant="outline" size="sm" className="h-6 text-[10px] sm:text-xs px-2">
            <a href={`tel:${manager.phone_number}`}>
              <Phone className="h-2.5 w-2.5 me-1" />
              {manager.phone_number}
            </a>
          </Button>
        )}
        {manager?.email && (
          <Button asChild variant="outline" size="sm" className="h-6 text-[10px] sm:text-xs px-2">
            <a href={`mailto:${manager.email}`}>
              <Mail className="h-2.5 w-2.5 me-1" />
              {t('common.email')}
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

// Hook to check if manager exists (for conditional rendering in parent)
export function useHasManager() {
  const { data: manager, isLoading } = useMyManager();
  return { hasManager: !!manager, isLoading };
}

// Legacy wrapper for backward compatibility
export function ManagerInfo() {
  const { i18n } = useTranslation();
  const { data: manager, isLoading } = useMyManager();
  const direction = i18n.dir();

  // Don't render if no manager assigned
  if (!isLoading && !manager) return null;

  return (
    <div dir={direction}>
      <ManagerInfoContent />
    </div>
  );
}
