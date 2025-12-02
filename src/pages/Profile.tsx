import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Loader2, User, Building2, Mail, Shield, Phone, UserCheck, MapPin, Upload } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useAvatarUpload } from "@/hooks/use-avatar-upload";
import { AvatarCropDialog } from "@/components/profile/AvatarCropDialog";

interface ProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  tenant_id: string;
  assigned_branch_id: string | null;
  assigned_site_id: string | null;
  created_at: string | null;
  branches?: { name: string; location: string | null } | null;
  sites?: { name: string; address: string | null } | null;
}

export default function Profile() {
  const { tenantName, activeSidebarIconUrl, activePrimaryColor } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("user");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAvatar, uploading } = useAvatarUpload();
  
  // Form states
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  
  // Crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);

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
        setFullName(profileData.full_name || "");
        setAvatarUrl(profileData.avatar_url);
        setPhoneNumber(profileData.phone_number || "");
        setEmergencyContactName(profileData.emergency_contact_name || "");
        setEmergencyContactPhone(profileData.emergency_contact_phone || "");
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only JPG, PNG, and GIF files are allowed",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB for cropping, will be compressed after)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 10MB",
        variant: "destructive",
      });
      return;
    }

    // Create object URL for cropping
    const imageUrl = URL.createObjectURL(file);
    setSelectedImageSrc(imageUrl);
    setCropDialogOpen(true);
    
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleCropComplete = async (blob: Blob) => {
    if (!user) return;

    // Convert blob to file for upload
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    
    const { url, error } = await uploadAvatar(file, user.id);
    
    // Clean up object URL
    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
      setSelectedImageSrc(null);
    }
    
    if (error) {
      toast({
        title: "Upload failed",
        description: error,
        variant: "destructive",
      });
      return;
    }

    if (url) {
      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) {
        toast({
          title: "Error",
          description: "Failed to save avatar URL",
          variant: "destructive",
        });
        return;
      }

      setAvatarUrl(url);
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated.",
      });
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
          phone_number: phoneNumber || null,
          emergency_contact_name: emergencyContactName || null,
          emergency_contact_phone: emergencyContactPhone || null,
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
    <div className="container max-w-5xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your account profile and view organization information.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Personal Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and profile picture.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar Upload */}
              <div className="flex items-center gap-6 pb-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {fullName ? fullName.substring(0, 2).toUpperCase() : <User className="h-8 w-8" />}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="font-medium">Profile Picture</h3>
                  <p className="text-sm text-muted-foreground">
                    JPG, GIF or PNG. Max size of 2MB.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Change Avatar
                      </>
                    )}
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
              </div>
            </CardContent>
          </Card>

          {/* Contact Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Add your phone number and emergency contact details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="phoneNumber" 
                    type="tel"
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-9"
                    placeholder="+966 5XX XXX XXXX"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-sm font-medium">Emergency Contact</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Person to contact in case of emergency at the workplace.
                </p>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="emergencyName" className="text-xs text-muted-foreground">Contact Name</Label>
                    <div className="relative">
                      <UserCheck className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="emergencyName" 
                        value={emergencyContactName} 
                        onChange={(e) => setEmergencyContactName(e.target.value)}
                        className="pl-9"
                        placeholder="Emergency contact name"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emergencyPhone" className="text-xs text-muted-foreground">Contact Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="emergencyPhone" 
                        type="tel"
                        value={emergencyContactPhone} 
                        onChange={(e) => setEmergencyContactPhone(e.target.value)}
                        className="pl-9"
                        placeholder="+966 5XX XXX XXXX"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={updateProfile} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Organization Card */}
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

          {/* Assignment Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assignment</CardTitle>
              <CardDescription>
                Your assigned branch and site location.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Branch Info */}
              <div className="rounded-md border p-4 bg-muted/10">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-full shrink-0">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Branch</p>
                    {profile?.branches ? (
                      <>
                        <p className="font-medium">{profile.branches.name}</p>
                        {profile.branches.location && (
                          <p className="text-sm text-muted-foreground">{profile.branches.location}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground italic">Not Assigned</p>
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
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Site</p>
                    {profile?.sites ? (
                      <>
                        <p className="font-medium">{profile.sites.name}</p>
                        {profile.sites.address && (
                          <p className="text-sm text-muted-foreground">{profile.sites.address}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground italic">Not Assigned</p>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Branch and site assignments are managed by your administrator.
              </p>
            </CardContent>
          </Card>

          {/* Security & Role Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Security & Role</CardTitle>
              <CardDescription>
                Your current access level within the organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border p-4 bg-muted/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">Current Role</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-semibold text-foreground capitalize">{userRole}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            </Card>
        </div>
      </div>

      {/* Avatar Crop Dialog */}
      {selectedImageSrc && (
        <AvatarCropDialog
          open={cropDialogOpen}
          onOpenChange={(open) => {
            setCropDialogOpen(open);
            if (!open && selectedImageSrc) {
              URL.revokeObjectURL(selectedImageSrc);
              setSelectedImageSrc(null);
            }
          }}
          imageSrc={selectedImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
