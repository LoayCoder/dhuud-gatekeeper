import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Briefcase, Shield, UserCheck, Users } from "lucide-react";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { SecuritySettings } from "@/components/profile/SecuritySettings";
import { TenantInfoContent } from "@/components/profile/TenantInfo";
import { AssignmentInfoContent } from "@/components/profile/AssignmentInfo";
import { RoleInfoContent } from "@/components/profile/RoleInfo";
import { ManagerInfoContent, useHasManager } from "@/components/profile/ManagerInfo";
import { TeamInfoContent, useHasTeam } from "@/components/profile/TeamInfo";
import { ProfileCollapsibleCard } from "@/components/profile/ProfileCollapsibleCard";
import { ProfileData } from "@/components/profile/types";
import { RTLWrapper } from "@/components";
import { useAuth } from "@/contexts/AuthContext";
import { useCachedProfile } from "@/hooks/use-cached-profile";
import { useUserRoles } from "@/hooks/use-user-roles";

export default function Profile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Use cached profile - prevents refetch for 5 minutes
  const { data: cachedProfile, isLoading: profileLoading, refetch } = useCachedProfile();
  const { userRoles, isLoading: rolesLoading } = useUserRoles();
  const { hasManager, isLoading: managerLoading } = useHasManager();
  const { hasTeam, teamCount, isLoading: teamLoading } = useHasTeam();

  const loading = profileLoading || rolesLoading;
  const profile = cachedProfile as ProfileData | null;

  if (loading) {
    return (
      <RTLWrapper className="h-full overflow-auto scroll-smooth bg-gradient-to-br from-background via-background to-muted/20">
        <div className="w-full max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-4 animate-fade-in">
          {/* Title skeleton */}
          <div className="space-y-1.5">
            <Skeleton className="h-7 sm:h-8 w-32 sm:w-48" />
            <Skeleton className="h-4 w-48 sm:w-64" />
          </div>
          
          {/* Cards skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-80 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        </div>
      </RTLWrapper>
    );
  }

  return (
    <RTLWrapper className="h-full overflow-auto scroll-smooth bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-4">
        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">{t('profile.title')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('profile.description')}
          </p>
        </div>

        {/* Collapsible Cards */}
        <div className="space-y-3">
          {/* 1. Organization - First, expanded by default */}
          <ProfileCollapsibleCard
            title={t('tenant.organization')}
            icon={Building2}
            defaultExpanded={true}
          >
            <TenantInfoContent memberSince={profile?.created_at || null} />
          </ProfileCollapsibleCard>

          {/* 2. Personal Information - Second, expanded by default */}
          <ProfileCollapsibleCard
            title={t('profile.personalInfo')}
            description={t('profile.updatePersonalInfo')}
            icon={User}
            defaultExpanded={true}
          >
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-5 h-9 sm:h-10">
                <TabsTrigger value="profile" className="text-xs sm:text-sm">{t('profile.profileTab')}</TabsTrigger>
                <TabsTrigger value="security" className="text-xs sm:text-sm">{t('profile.securityTab')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="mt-0">
                {user && (
                  <ProfileForm 
                    user={user} 
                    profile={profile} 
                    onUpdate={() => refetch()} 
                  />
                )}
              </TabsContent>
              
              <TabsContent value="security" className="mt-0">
                <SecuritySettings />
              </TabsContent>
            </Tabs>
          </ProfileCollapsibleCard>

          {/* 3. Work Assignment - Collapsed by default */}
          <ProfileCollapsibleCard
            title={t('assignment.title')}
            description={t('assignment.description')}
            icon={Briefcase}
            defaultExpanded={false}
          >
            <AssignmentInfoContent profile={profile} />
          </ProfileCollapsibleCard>

          {/* 4. Roles & Permissions - Collapsed by default */}
          <ProfileCollapsibleCard
            title={t('role.title')}
            description={t('role.roleDescription')}
            icon={Shield}
            defaultExpanded={false}
            badge={
              userRoles.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {userRoles.length}
                </Badge>
              )
            }
          >
            <RoleInfoContent roles={userRoles} />
          </ProfileCollapsibleCard>

          {/* 5. Manager - Collapsed by default (only show if manager exists) */}
          {(hasManager || managerLoading) && (
            <ProfileCollapsibleCard
              title={t('profile.myManager')}
              description={t('profile.myManagerDescription')}
              icon={UserCheck}
              defaultExpanded={false}
            >
              <ManagerInfoContent />
            </ProfileCollapsibleCard>
          )}

          {/* 6. Team - Collapsed by default (only show if user is manager with team) */}
          {(hasTeam || teamLoading) && (
            <ProfileCollapsibleCard
              title={t('profile.myTeam')}
              description={t('profile.myTeamDescription')}
              icon={Users}
              defaultExpanded={false}
              badge={
                teamCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {teamCount}
                  </Badge>
                )
              }
            >
              <TeamInfoContent />
            </ProfileCollapsibleCard>
          )}
        </div>
      </div>
    </RTLWrapper>
  );
}
