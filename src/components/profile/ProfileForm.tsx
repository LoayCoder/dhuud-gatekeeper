import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, User, Mail, Phone, UserCheck, Upload, Briefcase, AlertTriangle, LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAvatarUpload } from "@/hooks/use-avatar-upload";
import { AvatarCropDialog } from "@/components/profile/AvatarCropDialog";
import { ProfileData, AuthUser, ProfileFormData } from "./types";
import { profileFormSchema, ProfileFormValues } from "./ProfileFormSchema";
import { useNavigate } from "react-router-dom";

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAvatar, uploading } = useAvatarUpload();

  // Check for email mismatch between session and profile
  const sessionEmail = user?.email || "";
  const profileEmail = profile?.email || "";
  const hasEmailMismatch = profileEmail && sessionEmail && profileEmail.toLowerCase() !== sessionEmail.toLowerCase();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: profile?.full_name || '',
      avatarUrl: profile?.avatar_url || '',
      phoneNumber: profile?.phone_number || '',
      emergencyContactName: profile?.emergency_contact_name || '',
      emergencyContactPhone: profile?.emergency_contact_phone || '',
    },
  });

  useEffect(() => {
    form.reset({
      fullName: profile?.full_name || '',
      avatarUrl: profile?.avatar_url || '',
      phoneNumber: profile?.phone_number || '',
      emergencyContactName: profile?.emergency_contact_name || '',
      emergencyContactPhone: profile?.emergency_contact_phone || '',
    });
  }, [
    form,
    profile?.full_name,
    profile?.avatar_url,
    profile?.phone_number,
    profile?.emergency_contact_name,
    profile?.emergency_contact_phone,
  ]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);

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
      }).eq('user_id', user.id);
      if (updateError) {
        toast({
          title: t('auth.error'),
          description: t('profile.avatarSaveError'),
          variant: "destructive"
        });
        return;
      }
      form.setValue('avatarUrl', url);
      toast({
        title: t('profile.profileUpdated'),
        description: t('profile.profileUpdateSuccess')
      });
    }
  };

  const updateProfile = async (values: ProfileFormValues) => {
    try {
      setSaving(true);
      const {
        error
      } = await supabase.from('profiles').update({
        full_name: values.fullName?.trim() || null,
        phone_number: values.phoneNumber?.trim() || null,
        emergency_contact_name: values.emergencyContactName?.trim() || null,
        emergency_contact_phone: values.emergencyContactPhone?.trim() || null,
        updated_at: new Date().toISOString()
      }).eq('user_id', user.id);
      if (error) throw error;
      toast({
        title: t('profile.profileUpdated'),
        description: t('profile.profileUpdateSuccess')
      });
      onUpdate();
    } catch (error: unknown) {
      toast({
        title: t('auth.error'),
        description: (error as Error).message || t('profile.profileUpdateError'),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const avatarUrl = form.watch('avatarUrl');
  const fullName = form.watch('fullName');

  return <div className="space-y-4 sm:space-y-5">
      {/* Email Mismatch Warning Banner */}
      {hasEmailMismatch && (
        <Alert variant="destructive" className="border-warning bg-warning/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm">
              {t('profile.emailMismatchWarning', { 
                newEmail: profileEmail,
                defaultValue: `Your login email has been changed to ${profileEmail}. Please log out and log back in with your new email.`
              })}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="shrink-0 h-7 text-xs"
            >
              <LogOut className="me-1.5 h-3.5 w-3.5" />
              {t('common.logout', { defaultValue: 'Log Out' })}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Avatar Upload */}
      <div className="gap-3 sm:gap-4 pb-4 flex flex-col sm:flex-row items-center justify-center">
        <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
          <AvatarImage src={avatarUrl || undefined} alt={fullName} />
          <AvatarFallback className="text-base sm:text-lg bg-primary/10 text-primary">
            {fullName ? fullName.substring(0, 2).toUpperCase() : <User className="h-6 w-6 sm:h-7 sm:w-7" />}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-0.5 text-center sm:text-start">
          <h3 className="font-medium text-sm sm:text-base">{t('profile.profilePicture')}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('profile.avatarHint')}
          </p>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif" onChange={handleFileSelect} className="hidden" />
          <Button variant="outline" size="sm" className="mt-1.5 h-8 text-xs sm:text-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <>
                <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                {t('common.loading')}
              </> : <>
                <Upload className="me-1.5 h-3.5 w-3.5" />
                {t('profile.changeAvatar')}
              </>}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Personal Information */}
      <div className="grid gap-3 pt-3">
        <div className="grid gap-1.5">
          <Label htmlFor="email" className="text-xs sm:text-sm">{t('profile.emailAddress')}</Label>
          <div className="relative">
            <Mail className="absolute start-3 top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input 
              id="email" 
              value={profileEmail || sessionEmail} 
              disabled 
              className={`ps-9 h-9 sm:h-10 text-xs sm:text-sm bg-muted/50 ${hasEmailMismatch ? 'border-warning' : ''}`} 
            />
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {t('profile.emailManagedByOrg')}
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="fullName" className="text-xs sm:text-sm">{t('profile.fullName')}</Label>
          <div className="relative">
            <User className="absolute start-3 top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input id="fullName" {...form.register('fullName')} placeholder={t('profile.enterFullName')} maxLength={100} className="ps-9 h-9 sm:h-10 text-xs sm:text-sm" />
          </div>
        </div>

        {/* Job Title - Read Only (managed by admin) */}
        <div className="grid gap-1.5">
          <Label htmlFor="jobTitle" className="text-xs sm:text-sm">{t('profile.jobTitle')}</Label>
          <div className="relative">
            <Briefcase className="absolute start-3 top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input 
              id="jobTitle" 
              value={profile?.job_title || ""} 
              disabled 
              className="ps-9 h-9 sm:h-10 text-xs sm:text-sm bg-muted/50" 
            />
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {t('profile.jobTitleManagedByAdmin')}
          </p>
        </div>
      </div>

      <Separator />

      {/* Contact Information */}
      <div className="space-y-3">
        <div className="grid gap-1.5">
          <Label htmlFor="phoneNumber" className="text-xs sm:text-sm">{t('profile.phoneNumber')}</Label>
          <div className="relative">
            <Phone className="absolute start-3 top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input id="phoneNumber" type="tel" {...form.register('phoneNumber')} dir="ltr" placeholder="+966 5XX XXX XXXX" maxLength={20} className="ps-9 h-9 sm:h-10 text-xs sm:text-sm" />
          </div>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label className="text-xs sm:text-sm font-medium">{t('profile.emergencyContact')}</Label>
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">
            {t('profile.emergencyContactDescription')}
          </p>
          
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="emergencyName" className="text-[10px] sm:text-xs text-muted-foreground">{t('profile.emergencyContactName')}</Label>
              <div className="relative">
                <UserCheck className="absolute start-3 top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input id="emergencyName" {...form.register('emergencyContactName')} placeholder={t('profile.emergencyContactName')} maxLength={100} className="ps-9 h-9 sm:h-10 text-xs sm:text-sm" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="emergencyPhone" className="text-[10px] sm:text-xs text-muted-foreground">{t('profile.emergencyContactPhone')}</Label>
              <div className="relative">
                <Phone className="absolute start-3 top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input id="emergencyPhone" type="tel" {...form.register('emergencyContactPhone')} dir="ltr" placeholder="+966 5XX XXX XXXX" maxLength={20} className="ps-9 h-9 sm:h-10 text-xs sm:text-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-3">
        <Button onClick={form.handleSubmit(updateProfile)} disabled={saving} className="h-9 text-xs sm:text-sm">
          {saving && <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />}
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
