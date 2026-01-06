import { useTranslation } from "react-i18next";
import { User, Phone, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMyManager } from "@/hooks/use-my-manager";
import { Skeleton } from "@/components/ui/skeleton";

export function ManagerInfo() {
  const { t, i18n } = useTranslation();
  const { data: manager, isLoading } = useMyManager();
  const direction = i18n.dir();

  // Don't render if no manager assigned
  if (!isLoading && !manager) return null;

  if (isLoading) {
    return (
      <Card dir={direction}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card dir={direction}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-start">{t('profile.myManager')}</CardTitle>
        <CardDescription className="text-start text-xs">
          {t('profile.myManagerDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border p-3 bg-muted/10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">{manager?.full_name || t('common.unknown')}</p>
              {manager?.job_title && (
                <p className="text-xs text-muted-foreground">{manager.job_title}</p>
              )}
            </div>
          </div>
          
          {/* Contact buttons */}
          <div className="flex gap-2 flex-wrap">
            {manager?.phone_number && (
              <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                <a href={`tel:${manager.phone_number}`}>
                  <Phone className="h-3 w-3 me-1" />
                  {manager.phone_number}
                </a>
              </Button>
            )}
            {manager?.email && (
              <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                <a href={`mailto:${manager.email}`}>
                  <Mail className="h-3 w-3 me-1" />
                  {t('common.email')}
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
