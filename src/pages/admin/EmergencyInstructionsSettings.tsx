import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Phone, Save, Loader2, Eye, EyeOff, User } from 'lucide-react';
import { toast } from 'sonner';

interface EmergencySettings {
  visitor_hsse_instructions_en: string | null;
  visitor_hsse_instructions_ar: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
}

export default function EmergencyInstructionsSettings() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar' || i18n.language === 'ur';
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [settings, setSettings] = useState<EmergencySettings>({
    visitor_hsse_instructions_en: '',
    visitor_hsse_instructions_ar: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
  });

  useEffect(() => {
    fetchSettings();
  }, [user?.id]);

  const fetchSettings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get user's tenant_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile?.tenant_id) {
        toast.error(t('common.error', 'Error'), {
          description: t('admin.emergencyInstructions.noTenant', 'No tenant found for your profile')
        });
        return;
      }

      setTenantId(profile.tenant_id);

      // Fetch tenant settings
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('visitor_hsse_instructions_en, visitor_hsse_instructions_ar, emergency_contact_name, emergency_contact_number')
        .eq('id', profile.tenant_id)
        .maybeSingle();

      if (tenantError) throw tenantError;

      if (tenant) {
        setSettings({
          visitor_hsse_instructions_en: tenant.visitor_hsse_instructions_en || '',
          visitor_hsse_instructions_ar: tenant.visitor_hsse_instructions_ar || '',
          emergency_contact_name: tenant.emergency_contact_name || '',
          emergency_contact_number: tenant.emergency_contact_number || '',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error(t('common.error', 'Error'), {
        description: t('admin.emergencyInstructions.fetchError', 'Failed to load settings')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('tenants')
        .update({
          visitor_hsse_instructions_en: settings.visitor_hsse_instructions_en || null,
          visitor_hsse_instructions_ar: settings.visitor_hsse_instructions_ar || null,
          emergency_contact_name: settings.emergency_contact_name || null,
          emergency_contact_number: settings.emergency_contact_number || null,
        })
        .eq('id', tenantId);

      if (error) throw error;

      toast.success(t('common.success', 'Success'), {
        description: t('admin.emergencyInstructions.saveSuccess', 'Emergency instructions saved successfully')
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t('common.error', 'Error'), {
        description: t('admin.emergencyInstructions.saveError', 'Failed to save settings')
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-warning" />
          <h1 className="text-2xl font-bold">
            {t('admin.emergencyInstructions.title', 'Emergency Instructions')}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {t('admin.emergencyInstructions.description', 'Configure emergency contact details and HSSE instructions for visitors and workers')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Emergency Contact Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-destructive" />
              {t('admin.emergencyInstructions.emergencyContact', 'Emergency Contact')}
            </CardTitle>
            <CardDescription>
              {t('admin.emergencyInstructions.emergencyContactDesc', 'Primary emergency contact displayed on visitor/worker passes')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('admin.emergencyInstructions.contactName', 'Contact Name')}
              </Label>
              <Input
                id="contact-name"
                value={settings.emergency_contact_name || ''}
                onChange={(e) => setSettings({ ...settings, emergency_contact_name: e.target.value })}
                placeholder={t('admin.emergencyInstructions.contactNamePlaceholder', 'e.g., Security Control Room')}
                dir="auto"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-number" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {t('admin.emergencyInstructions.contactNumber', 'Contact Number')}
              </Label>
              <Input
                id="contact-number"
                type="tel"
                value={settings.emergency_contact_number || ''}
                onChange={(e) => setSettings({ ...settings, emergency_contact_number: e.target.value })}
                placeholder={t('admin.emergencyInstructions.contactNumberPlaceholder', 'e.g., +966 5x xxx xxxx')}
                dir="ltr"
                className="text-start"
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {showPreview ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                {t('admin.emergencyInstructions.preview', 'Preview')}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview 
                  ? t('admin.emergencyInstructions.hidePreview', 'Hide Preview')
                  : t('admin.emergencyInstructions.showPreview', 'Show Preview')
                }
              </Button>
            </div>
            <CardDescription>
              {t('admin.emergencyInstructions.previewDesc', 'How instructions appear on visitor/worker passes')}
            </CardDescription>
          </CardHeader>
          {showPreview && (
            <CardContent>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-destructive font-semibold">
                  <AlertTriangle className="h-5 w-5" />
                  {t('visitorPass.emergencyContact', 'Emergency Contact')}
                </div>
                
                {settings.emergency_contact_name && (
                  <p className="text-sm font-medium">{settings.emergency_contact_name}</p>
                )}
                
                {settings.emergency_contact_number && (
                  <a 
                    href={`tel:${settings.emergency_contact_number}`}
                    className="text-lg font-bold text-destructive hover:underline"
                    dir="ltr"
                  >
                    {settings.emergency_contact_number}
                  </a>
                )}

                {(settings.visitor_hsse_instructions_en || settings.visitor_hsse_instructions_ar) && (
                  <div className="mt-4 pt-3 border-t border-destructive/20">
                    <p className="text-sm font-medium text-destructive mb-2">
                      {t('visitorPass.safetyInstructions', 'Safety Instructions')}
                    </p>
                    {isRTL ? (
                      <p className="text-sm whitespace-pre-wrap" dir="rtl">
                        {settings.visitor_hsse_instructions_ar || settings.visitor_hsse_instructions_en}
                      </p>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap" dir="ltr">
                        {settings.visitor_hsse_instructions_en || settings.visitor_hsse_instructions_ar}
                      </p>
                    )}
                  </div>
                )}

                {!settings.emergency_contact_name && !settings.emergency_contact_number && 
                 !settings.visitor_hsse_instructions_en && !settings.visitor_hsse_instructions_ar && (
                  <p className="text-sm text-muted-foreground italic">
                    {t('admin.emergencyInstructions.noContent', 'No emergency information configured yet')}
                  </p>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* HSSE Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {t('admin.emergencyInstructions.hsseInstructions', 'HSSE Instructions')}
          </CardTitle>
          <CardDescription>
            {t('admin.emergencyInstructions.hsseInstructionsDesc', 'Bilingual safety instructions displayed on visitor and worker access passes')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="english" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="english">
                {t('common.english', 'English')}
              </TabsTrigger>
              <TabsTrigger value="arabic">
                {t('common.arabic', 'العربية')}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="english" className="mt-4">
              <div className="space-y-2">
                <Label htmlFor="instructions-en">
                  {t('admin.emergencyInstructions.instructionsEn', 'Instructions (English)')}
                </Label>
                <Textarea
                  id="instructions-en"
                  value={settings.visitor_hsse_instructions_en || ''}
                  onChange={(e) => setSettings({ ...settings, visitor_hsse_instructions_en: e.target.value })}
                  placeholder={t('admin.emergencyInstructions.instructionsEnPlaceholder', 
                    'e.g., In case of emergency:\n• Proceed to the nearest assembly point\n• Follow security personnel instructions\n• Do not use elevators during emergencies'
                  )}
                  rows={8}
                  dir="ltr"
                  className="text-start"
                />
                <p className="text-xs text-muted-foreground">
                  {t('admin.emergencyInstructions.instructionsTip', 'Use line breaks for better readability')}
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="arabic" className="mt-4">
              <div className="space-y-2">
                <Label htmlFor="instructions-ar">
                  {t('admin.emergencyInstructions.instructionsAr', 'Instructions (Arabic)')}
                </Label>
                <Textarea
                  id="instructions-ar"
                  value={settings.visitor_hsse_instructions_ar || ''}
                  onChange={(e) => setSettings({ ...settings, visitor_hsse_instructions_ar: e.target.value })}
                  placeholder={t('admin.emergencyInstructions.instructionsArPlaceholder', 
                    'مثال: في حالة الطوارئ:\n• توجه إلى أقرب نقطة تجمع\n• اتبع تعليمات أفراد الأمن\n• لا تستخدم المصاعد أثناء الطوارئ'
                  )}
                  rows={8}
                  dir="rtl"
                  className="text-start"
                />
                <p className="text-xs text-muted-foreground">
                  {t('admin.emergencyInstructions.instructionsTip', 'Use line breaks for better readability')}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin me-2" />
              {t('common.saving', 'Saving...')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 me-2" />
              {t('common.save', 'Save Changes')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
