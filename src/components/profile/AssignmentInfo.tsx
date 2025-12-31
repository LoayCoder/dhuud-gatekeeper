import { useTranslation } from "react-i18next";
import { Building2, MapPin, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileData } from "./types";
import { useUserDepartmentSites } from "@/hooks/use-user-department-sites";

interface AssignmentInfoProps {
  profile: ProfileData | null;
}

export function AssignmentInfo({ profile }: AssignmentInfoProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  // Fetch sites via department if no direct site assignment
  const { data: departmentSites = [] } = useUserDepartmentSites(
    !profile?.sites && profile?.assigned_department_id 
      ? profile.assigned_department_id 
      : null
  );

  return (
    <Card dir={direction}>
      <CardHeader>
        <CardTitle className="text-lg text-start">{t('assignment.title')}</CardTitle>
        <CardDescription className="text-start">
          {t('assignment.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Branch Info */}
        <div className="rounded-md border p-4 bg-muted/10">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-full shrink-0">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('assignment.branch')}</p>
              {profile?.branches ? (
                <>
                  <p className="font-medium">{profile.branches.name}</p>
                  {profile.branches.location && (
                    <p className="text-sm text-muted-foreground">{profile.branches.location}</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground italic">{t('assignment.notAssigned')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Site Info */}
        <div className="rounded-md border p-4 bg-muted/10">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-full shrink-0">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t('assignment.site')}</p>
              {profile?.sites ? (
                <>
                  <p className="font-medium">{profile.sites.name}</p>
                  {profile.sites.address && (
                    <p className="text-sm text-muted-foreground">{profile.sites.address}</p>
                  )}
                </>
              ) : departmentSites.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    {t('assignment.sitesViaDepartment', 'Sites via department assignment:')}
                  </p>
                  {departmentSites.map(site => (
                    <div key={site.id} className="flex items-center gap-2">
                      <p className="font-medium">{site.name}</p>
                      {site.is_primary && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 me-1" />
                          {t('common.primary', 'Primary')}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">{t('assignment.notAssigned')}</p>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {t('assignment.managedByAdmin')}
        </p>
      </CardContent>
    </Card>
  );
}
