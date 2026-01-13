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

  const loading = profileLoading || rolesLoading;
  const profile = cachedProfile as ProfileData | null;

  if (loading) {
    return (
      <RTLWrapper className="h-full overflow-auto scroll-smooth bg-gradient-to-br from-background via-background to-muted/20">
        <div className="w-full max-w-6xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-fade-in">
          {/* Title skeleton */}
          <div className="space-y-1.5">
            <Skeleton className="h-7 sm:h-8 w-32 sm:w-48" />
            <Skeleton className="h-4 w-48 sm:w-64" />
          </div>
          
          {/* Grid skeleton */}
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_300px] lg:gap-6 xl:grid-cols-[1fr_320px]">
            <Skeleton className="h-80 sm:h-[28rem] order-2 lg:order-1 rounded-lg" />
            <div className="order-1 lg:order-2 space-y-4">
              <Skeleton className="h-36 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          </div>
        </div>
      </RTLWrapper>
    );
  }

  return (
    <RTLWrapper className="h-full overflow-auto scroll-smooth bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full max-w-6xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">{t('profile.title')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('profile.description')}
          </p>
        </div>

        {/* Main Grid Layout */}
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_300px] lg:gap-6 xl:grid-cols-[1fr_320px]">
          {/* Left Column - Main Content */}
          <div className="order-2 lg:order-1">
            <Card className="border-border/50 bg-card/80 shadow-lg backdrop-blur-sm">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-start">
                  {t('profile.personalInfo')}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-start">
                  {t('profile.updatePersonalInfo')}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
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
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar (shows first on mobile due to order) */}
          <div className="order-1 lg:order-2 space-y-3 sm:space-y-4">
            <TenantInfo memberSince={profile?.created_at || null} />
            <AssignmentInfo profile={profile} />
            <RoleInfo roles={userRoles} />
            <ManagerInfo />
            <TeamInfo />
          </div>
        </div>
      </div>
    </RTLWrapper>
  );
}
