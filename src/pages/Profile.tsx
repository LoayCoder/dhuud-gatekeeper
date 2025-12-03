import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { SecuritySettings } from "@/components/profile/SecuritySettings";
import { TenantInfo } from "@/components/profile/TenantInfo";
import { AssignmentInfo } from "@/components/profile/AssignmentInfo";
import { RoleInfo } from "@/components/profile/RoleInfo";
import { ProfileData } from "@/components/profile/types";
import { RTLWrapper } from "@/components/RTLWrapper";

export default function Profile() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>("user");

  const getProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);

      // Fetch profile with branch and site joins
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          branches:assigned_branch_id(name, location),
          sites:assigned_site_id(name, address)
        `)
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      }

      if (profileData) {
        setProfile(profileData as ProfileData);
      }

      // Fetch user role from user_roles table
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData) {
        setUserRole(roleData.role);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
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

      <div className="grid gap-8 lg:grid-cols-[1fr_300px] rtl:lg:grid-cols-[300px_1fr]">
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
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="profile">{t('profile.profileTab')}</TabsTrigger>
                  <TabsTrigger value="security">{t('profile.securityTab')}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="profile">
                  {user && (
                    <ProfileForm 
                      user={user} 
                      profile={profile} 
                      onUpdate={getProfile} 
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
