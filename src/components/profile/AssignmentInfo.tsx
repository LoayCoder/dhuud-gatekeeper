import { useTranslation } from "react-i18next";
import { Building2, MapPin, Star, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProfileData } from "./types";
import { useUserDepartmentSites } from "@/hooks/use-user-department-sites";

interface AssignmentInfoProps {
  profile: ProfileData | null;
}

// Content-only version for use with ProfileCollapsibleCard
export function AssignmentInfoContent({ profile }: AssignmentInfoProps) {
  const { t } = useTranslation();

  // Fetch sites via department if no direct site assignment
  const { data: departmentSites = [] } = useUserDepartmentSites(
    !profile?.sites && profile?.assigned_department_id 
      ? profile.assigned_department_id 
      : null
  );

  // Check if user has full access (not assigned to specific branch/site)
  const hasFullBranchAccess = profile?.has_full_branch_access === true;
  // Sites follow branch access - if user has all branches, they have all sites too
  const hasFullSiteAccess = hasFullBranchAccess;

  return (
    <div className="space-y-3">
      {/* Branch Info */}
      <div className="rounded-md border p-3 bg-muted/10">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 bg-primary/10 rounded-full shrink-0">
            {hasFullBranchAccess ? (
              <Globe className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Building2 className="h-3.5 w-3.5 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{t('assignment.branch')}</p>
            {hasFullBranchAccess ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-medium text-xs sm:text-sm text-primary">{t('assignment.allBranches', 'All Branches')}</p>
                <Badge variant="secondary" className="text-[10px] h-5">
                  <Globe className="h-2.5 w-2.5 me-0.5" />
                  {t('assignment.fullAccess', 'Full Access')}
                </Badge>
              </div>
            ) : profile?.branches ? (
              <>
                <p className="font-medium text-xs sm:text-sm">{profile.branches.name}</p>
                {profile.branches.location && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{profile.branches.location}</p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground italic text-xs">{t('assignment.notAssigned')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Site Info */}
      <div className="rounded-md border p-3 bg-muted/10">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 bg-primary/10 rounded-full shrink-0">
            {hasFullSiteAccess ? (
              <Globe className="h-3.5 w-3.5 text-primary" />
            ) : (
              <MapPin className="h-3.5 w-3.5 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{t('assignment.site')}</p>
            {hasFullSiteAccess ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-medium text-xs sm:text-sm text-primary">{t('assignment.allSites', 'All Sites')}</p>
                <Badge variant="secondary" className="text-[10px] h-5">
                  <Globe className="h-2.5 w-2.5 me-0.5" />
                  {t('assignment.fullAccess', 'Full Access')}
                </Badge>
              </div>
            ) : profile?.sites ? (
              <>
                <p className="font-medium text-xs sm:text-sm">{profile.sites.name}</p>
                {profile.sites.address && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{profile.sites.address}</p>
                )}
              </>
            ) : departmentSites.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground mb-1">
                  {t('assignment.sitesViaDepartment', 'Sites via department assignment:')}
                </p>
                {departmentSites.map(site => (
                  <div key={site.id} className="flex items-center gap-1.5">
                    <p className="font-medium text-xs sm:text-sm">{site.name}</p>
                    {site.is_primary && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        <Star className="h-2.5 w-2.5 me-0.5" />
                        {t('common.primary', 'Primary')}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic text-xs">{t('assignment.notAssigned')}</p>
            )}
          </div>
        </div>
      </div>

      <p className="text-[10px] sm:text-xs text-muted-foreground">
        {t('assignment.managedByAdmin')}
      </p>
    </div>
  );
}

// Legacy wrapper for backward compatibility
export function AssignmentInfo({ profile }: AssignmentInfoProps) {
  const { i18n } = useTranslation();
  const direction = i18n.dir();

  return (
    <div dir={direction}>
      <AssignmentInfoContent profile={profile} />
    </div>
  );
}
