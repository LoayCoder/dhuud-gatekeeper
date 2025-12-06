import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { SecuritySettings } from "@/components/profile/SecuritySettings";
import { TenantInfo } from "@/components/profile/TenantInfo";
import { AssignmentInfo } from "@/components/profile/AssignmentInfo";
import { RoleInfo } from "@/components/profile/RoleInfo";
import { ProfileData } from "@/components/profile/types";
import { RTLWrapper } from "@/components/RTLWrapper";
import { useAuth } from "@/contexts/AuthContext";
import { useCachedProfile, useCachedUserRole } from "@/hooks/use-cached-profile";

export default function Profile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Use cached profile - prevents refetch for 5 minutes
  const { data: cachedProfile, isLoading: profileLoading, refetch } = useCachedProfile();
  const { data: userRole = 'user', isLoading: roleLoading } = useCachedUserRole();

  const loading = profileLoading || roleLoading;
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
    <RTLWrapper className="container max-w-5xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('profile.title')}</h1>
        <p className="text-muted-foreground">
          {t('profile.description')}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Left Column - Main Content */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.personalInfo')}</CardTitle>
              <CardDescription>
                {t('profile.updatePersonalInfo')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-1 w-full mb-6">
                  <TabsTrigger value="profile" className="rtl:order-last">{t('profile.profileTab')}</TabsTrigger>
                  <TabsTrigger value="security" className="rtl:order-first">{t('profile.securityTab')}</TabsTrigger>
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

        {/* Right Column - Sidebar Info */}
        <div className="space-y-6">
          <TenantInfo memberSince={profile?.created_at || null} />
          <AssignmentInfo profile={profile} />
          <RoleInfo role={userRole} />
        </div>
      </div>
    </RTLWrapper>
  );
}
