import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Mail, Phone, UserCheck, Upload, Briefcase } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAvatarUpload } from "@/hooks/use-avatar-upload";
import { AvatarCropDialog } from "@/components/profile/AvatarCropDialog";
import { ProfileData, AuthUser, ProfileFormData } from "./types";
import { z } from "zod";
interface ProfileFormProps {
  user: AuthUser;
  profile: ProfileData | null;
  onUpdate: () => void;
}
export function ProfileForm({
  user,
  profile,
  onUpdate
}: ProfileFormProps) {
  const {
    t
  } = useTranslation();
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    uploadAvatar,
    uploading
  } = useAvatarUpload();

  // Form states
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || "");
  const [emergencyContactName, setEmergencyContactName] = useState(profile?.emergency_contact_name || "");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(profile?.emergency_contact_phone || "");

  // Crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const profileSchema = z.object({
    fullName: z.string().trim().max(100, t('validation.nameTooLong')),
    phoneNumber: z.string().trim().max(20, t('validation.phoneTooLong')).optional(),
    emergencyContactName: z.string().trim().max(100, t('validation.nameTooLong')).optional(),
    emergencyContactPhone: z.string().trim().max(20, t('validation.phoneTooLong')).optional()
  });
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: t('auth.error'),
        description: t('profile.fileTypeError'),
        variant: "destructive"
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('auth.error'),
        description: t('profile.fileSizeError'),
        variant: "destructive"
      });
      return;
    }
    const imageUrl = URL.createObjectURL(file);
    setSelectedImageSrc(imageUrl);
    setCropDialogOpen(true);
    e.target.value = "";
  };
  const handleCropComplete = async (blob: Blob) => {
    const file = new File([blob], "avatar.jpg", {
      type: "image/jpeg"
    });
    const {
      url,
      error
    } = await uploadAvatar(file, user.id);
    if (selectedImageSrc) {
      URL.revokeObjectURL(selectedImageSrc);
      setSelectedImageSrc(null);
    }
    if (error) {
      toast({
        title: t('auth.error'),
        description: error,
        variant: "destructive"
      });
      return;
    }
    if (url) {
      const {
        error: updateError
      } = await supabase.from('profiles').update({
        avatar_url: url,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
      if (updateError) {
        toast({
          title: t('auth.error'),
          description: t('profile.avatarSaveError'),
          variant: "destructive"
        });
        return;
      }
      setAvatarUrl(url);
      toast({
        title: t('profile.profileUpdated'),
        description: t('profile.profileUpdateSuccess')
      });
    }
  };
  const updateProfile = async () => {
    // Validate form data
    const validation = profileSchema.safeParse({
      fullName,
      phoneNumber,
      emergencyContactName,
      emergencyContactPhone
    });
    if (!validation.success) {
      toast({
        title: t('auth.validationError'),
        description: validation.error.errors[0]?.message || t('profile.invalidInput'),
        variant: "destructive"
      });
      return;
    }
    try {
      setSaving(true);
      const {
        error
      } = await supabase.from('profiles').update({
        full_name: fullName.trim() || null,
        phone_number: phoneNumber.trim() || null,
        emergency_contact_name: emergencyContactName.trim() || null,
        emergency_contact_phone: emergencyContactPhone.trim() || null,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
      if (error) throw error;
      toast({
        title: t('profile.profileUpdated'),
        description: t('profile.profileUpdateSuccess')
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: t('auth.error'),
        description: error.message || t('profile.profileUpdateError'),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  return <div className="space-y-6">
      {/* Avatar Upload */}
      <div className="gap-6 pb-6 flex-row flex items-center justify-center">
        <Avatar className="h-24 w-24 flex-shrink-0">
          <AvatarImage src={avatarUrl || undefined} alt={fullName} />
          <AvatarFallback className="text-lg bg-primary/10 text-primary">
            {fullName ? fullName.substring(0, 2).toUpperCase() : <User className="h-8 w-8" />}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1 px-0 mx-0">
          <h3 className="font-medium">{t('profile.profilePicture')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('profile.avatarHint')}
          </p>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif" onChange={handleFileSelect} className="hidden" />
          <Button variant="outline" size="sm" className="mt-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t('common.loading')}
              </> : <>
                <Upload className="me-2 h-4 w-4" />
                {t('profile.changeAvatar')}
              </>}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Personal Information */}
      <div className="grid gap-4 pt-4">
        <div className="grid gap-2">
          <Label htmlFor="email">{t('profile.emailAddress')}</Label>
          <div className="relative">
            <Mail className="absolute left-3 rtl:left-auto rtl:right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input id="email" value={user?.email || ""} disabled className="[padding-inline-start:2.25rem] px-[35px] bg-muted/50" />
          </div>
          <p className="text-[0.8rem] text-muted-foreground">
            {t('profile.emailManagedByOrg')}
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="fullName">{t('profile.fullName')}</Label>
          <div className="relative">
            <User className="absolute left-3 rtl:left-auto rtl:right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('profile.enterFullName')} maxLength={100} className="[padding-inline-start:2.25rem] px-[35px]" />
          </div>
        </div>

        {/* Job Title - Read Only (managed by admin) */}
        <div className="grid gap-2">
          <Label htmlFor="jobTitle">{t('profile.jobTitle')}</Label>
          <div className="relative">
            <Briefcase className="absolute left-3 rtl:left-auto rtl:right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              id="jobTitle" 
              value={profile?.job_title || ""} 
              disabled 
              className="[padding-inline-start:2.25rem] px-[35px] bg-muted/50" 
            />
          </div>
          <p className="text-[0.8rem] text-muted-foreground">
            {t('profile.jobTitleManagedByAdmin')}
          </p>
        </div>
      </div>

      <Separator />

      {/* Contact Information */}
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="phoneNumber">{t('profile.phoneNumber')}</Label>
          <div className="relative">
            <Phone className="absolute left-3 rtl:left-auto rtl:right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input id="phoneNumber" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} dir="ltr" placeholder="+966 5XX XXX XXXX" maxLength={20} className="[padding-inline-start:2.25rem] px-[35px]" />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('profile.emergencyContact')}</Label>
          <p className="text-sm text-muted-foreground mb-3">
            {t('profile.emergencyContactDescription')}
          </p>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="emergencyName" className="text-xs text-muted-foreground">{t('profile.emergencyContactName')}</Label>
              <div className="relative">
                <UserCheck className="absolute left-3 rtl:left-auto rtl:right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="emergencyName" value={emergencyContactName} onChange={e => setEmergencyContactName(e.target.value)} placeholder={t('profile.emergencyContactName')} maxLength={100} className="[padding-inline-start:2.25rem] px-[35px]" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emergencyPhone" className="text-xs text-muted-foreground">{t('profile.emergencyContactPhone')}</Label>
              <div className="relative">
                <Phone className="absolute left-3 rtl:left-auto rtl:right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="emergencyPhone" type="tel" value={emergencyContactPhone} onChange={e => setEmergencyContactPhone(e.target.value)} dir="ltr" placeholder="+966 5XX XXX XXXX" maxLength={20} className="[padding-inline-start:2.25rem] px-[35px]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={updateProfile} disabled={saving}>
          {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {t('profile.saveChanges')}
        </Button>
      </div>

      {/* Avatar Crop Dialog */}
      {selectedImageSrc && <AvatarCropDialog open={cropDialogOpen} onOpenChange={open => {
      setCropDialogOpen(open);
      if (!open && selectedImageSrc) {
        URL.revokeObjectURL(selectedImageSrc);
        setSelectedImageSrc(null);
      }
    }} imageSrc={selectedImageSrc} onCropComplete={handleCropComplete} />}
    </div>;
}