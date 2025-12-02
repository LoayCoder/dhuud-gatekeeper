import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Loader2, User, Building2, Mail, Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function Profile() {
  const { tenantName, activeSidebarIconUrl, activePrimaryColor } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("user");
  
  // Form states
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      setUser(user);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      }

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || "");
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

  const updateProfile = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error updating profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your account profile and view organization information.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_250px]">
        <div className="space-y-6">
          {/* Personal Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and profile information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6 pb-6">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {fullName ? fullName.substring(0, 2).toUpperCase() : <User className="h-8 w-8" />}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="font-medium">Profile Picture</h3>
                  <p className="text-sm text-muted-foreground">
                    JPG, GIF or PNG. Max size of 2MB.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2" disabled>
                    Change Avatar (Coming Soon)
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      value={user?.email || ""} 
                      disabled 
                      className="pl-9 bg-muted/50" 
                    />
                  </div>
                  <p className="text-[0.8rem] text-muted-foreground">
                    Email address is managed by your organization administrator.
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="fullName" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-9"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={updateProfile} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security & Role Card */}
          <Card>
            <CardHeader>
              <CardTitle>Security & Role</CardTitle>
              <CardDescription>
                View your current role and access level within the organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border p-4 bg-muted/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">Current Role</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You are logged in as a <span className="font-semibold text-foreground capitalize">{userRole}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tenant Information Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center text-center p-4 border rounded-lg bg-muted/10">
                <div 
                  className="h-16 w-16 rounded-full flex items-center justify-center mb-3 shadow-sm border"
                  style={{ backgroundColor: activePrimaryColor ? `hsl(${activePrimaryColor})` : 'hsl(var(--primary))' }}
                >
                  {activeSidebarIconUrl ? (
                    <img 
                      src={activeSidebarIconUrl} 
                      alt={tenantName} 
                      className="h-10 w-10 object-contain" 
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-primary-foreground" />
                  )}
                </div>
                <h3 className="font-semibold">{tenantName}</h3>
                <p className="text-xs text-muted-foreground mt-1">Enterprise Account</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Details</Label>
                <div className="text-sm grid gap-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Status</span>
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-green-600 inline-block" />
                      Active
                    </span>
                  </div>
                  {profile?.created_at && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Member Since</span>
                      <span>{new Date(profile.created_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
