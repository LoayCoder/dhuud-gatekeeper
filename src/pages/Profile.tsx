import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { SecuritySettings } from "@/components/profile/SecuritySettings";
import { TenantInfo } from "@/components/profile/TenantInfo";
import { AssignmentInfo } from "@/components/profile/AssignmentInfo";
import { RoleInfo } from "@/components/profile/RoleInfo";
import { ManagerInfo } from "@/components/profile/ManagerInfo";
import { TeamInfo } from "@/components/profile/TeamInfo";
import { ProfileData } from "@/components/profile/types";
import { RTLWrapper } from "@/components/RTLWrapper";
import { useAuth } from "@/contexts/AuthContext";
import { useCachedProfile } from "@/hooks/use-cached-profile";
import { useUserRoles } from "@/hooks/use-user-roles";

export default function Profile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Use cached profile - prevents refetch for 5 minutes
  const { data: cachedProfile, isLoading: profileLoading, refetch } = useCachedProfile();
  const { userRoles, isLoading: rolesLoading } = useUserRoles();

  const loading = profileLoading || rolesLoading;
  const profile = cachedProfile as ProfileData | null;

  if (loading) {
    return (
      <RTLWrapper className="container max-w-5xl py-8 space-y-8">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <Skeleton className="h-96" />
          <div className="space-y-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </RTLWrapper>
    );
  }

  return (
    <RTLWrapper className="container max-w-5xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('profile.title')}</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          {t('profile.description')}
        </p>
      </div>

      <div className="flex flex-col-reverse gap-6 lg:grid lg:grid-cols-[1fr_300px] lg:gap-8">
        {/* Left Column - Main Content */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-start">{t('profile.personalInfo')}</CardTitle>
              <CardDescription className="text-start">
                {t('profile.updatePersonalInfo')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="profile">{t('profile.profileTab')}</TabsTrigger>
                  <TabsTrigger value="security">{t('profile.securityTab')}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="profile">
                  {user && (
                    <ProfileForm 
                      user={user} 
                      profile={profile} 
                      onUpdate={() => refetch()} 
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="security">
                  <SecuritySettings />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar Info (shows first on mobile due to flex-col-reverse) */}
        <div className="space-y-4 sm:space-y-6">
          <TenantInfo memberSince={profile?.created_at || null} />
          <AssignmentInfo profile={profile} />
          <RoleInfo roles={userRoles} />
          <ManagerInfo />
          <TeamInfo />
        </div>
      </div>
    </RTLWrapper>
  );
}
