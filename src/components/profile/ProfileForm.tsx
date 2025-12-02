import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Mail, Phone, UserCheck, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAvatarUpload } from "@/hooks/use-avatar-upload";
import { AvatarCropDialog } from "@/components/profile/AvatarCropDialog";
import { ProfileData, AuthUser, ProfileFormData } from "./types";
import { z } from "zod";

const profileSchema = z.object({
  fullName: z.string().trim().max(100, "Name must be less than 100 characters"),
  phoneNumber: z.string().trim().max(20, "Phone number too long").optional(),
  emergencyContactName: z.string().trim().max(100, "Name must be less than 100 characters").optional(),
  emergencyContactPhone: z.string().trim().max(20, "Phone number too long").optional(),
});

interface ProfileFormProps {
  user: AuthUser;
  profile: ProfileData | null;
  onUpdate: () => void;
}

export function ProfileForm({ user, profile, onUpdate }: ProfileFormProps) {
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAvatar, uploading } = useAvatarUpload();
  
  // Form states
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || "");
  const [emergencyContactName, setEmergencyContactName] = useState(profile?.emergency_contact_name || "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(profile?.emergency_contact_phone || "");
  
  // Crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Only JPG, PNG, and GIF files are allowed",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 10MB",
        variant: "destructive",
      });
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setSelectedImageSrc(imageUrl);
    setCropDialogOpen(true);
    e.target.value = "";
  };

  const handleCropComplete = async (blob: Blob) => {
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    const { url, error } = await uploadAvatar(file, user.id);
    
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
    // Validate form data
    const validation = profileSchema.safeParse({
      fullName,
      phoneNumber,
      emergencyContactName,
      emergencyContactPhone,
    });

    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0]?.message || "Invalid input",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName.trim() || null,
          phone_number: phoneNumber.trim() || null,
          emergency_contact_name: emergencyContactName.trim() || null,
          emergency_contact_phone: emergencyContactPhone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
      onUpdate();
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

  return (
    <div className="space-y-6">
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

      {/* Personal Information */}
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
              maxLength={100}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Contact Information */}
      <div className="space-y-4">
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
              maxLength={20}
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
                  maxLength={100}
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
                  maxLength={20}
                />
              </div>
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
