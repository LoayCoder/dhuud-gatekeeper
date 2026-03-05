/**
 * ID Card Settings Admin Page
 * Configure ID card designs for each card type with live preview
 */
import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  IDCardSettingsForm, 
  IDCardLivePreview,
  DuplicateSettingsDialog,
  type DuplicateOptions,
} from '@/features/admin';
import { useIDCardSettings, useDuplicateIDCardSettings } from "@/hooks/use-id-card-settings";
import { useCachedProfile } from "@/hooks/use-cached-profile";
import { CARD_TYPE_LABELS, type IDCardType, type TenantIDCardSettings } from "@/types/id-card.types";
import { Skeleton } from "@/components/ui/skeleton";

const CARD_TYPES: IDCardType[] = ['visitor', 'visitor_vip', 'worker', 'employee', 'contractor_rep'];

// Default settings factory
function getDefaultSettings(cardType: IDCardType): Partial<TenantIDCardSettings> {
  const base: Partial<TenantIDCardSettings> = {
    card_type: cardType,
    front_bg_color: '#FFFFFF',
    front_accent_color: '#3b82f6',
    front_text_color: '#1f2937',
    show_photo: true,
    show_qr_code: true,
    qr_position: 'bottom',
    front_fields: ['full_name', 'company', 'role', 'valid_until'],
    back_enabled: false,
    back_bg_color: '#f9fafb',
    back_fields: ['emergency_contact', 'safety_instructions'],
    back_custom_text: null,
    back_custom_text_ar: null,
    card_orientation: 'portrait',
    show_logo: true,
    logo_position: 'top-left',
    show_tenant_name: true,
    template_preset: 'standard',
    is_active: true,
  };

  // Card-type specific defaults
  switch (cardType) {
    case 'visitor':
      base.front_fields = ['full_name', 'company', 'destination', 'host_name', 'valid_until'];
      base.front_accent_color = '#3b82f6';
      base.back_enabled = true;
      break;
    case 'visitor_vip':
      base.front_fields = ['full_name', 'company', 'destination', 'valid_until'];
      base.front_accent_color = '#ca8a04';
      base.template_preset = 'corporate';
      break;
    case 'worker':
      base.front_fields = ['full_name', 'company', 'role', 'project', 'valid_until'];
      base.front_accent_color = '#f97316';
      base.back_enabled = true;
      base.back_fields = ['safety_instructions', 'induction_status', 'emergency_contact'];
      base.template_preset = 'safety';
      break;
    case 'employee':
      base.front_fields = ['full_name', 'department', 'role', 'employee_id'];
      base.front_accent_color = '#1e40af';
      base.template_preset = 'corporate';
      break;
    case 'contractor_rep':
      base.front_fields = ['full_name', 'company', 'role', 'valid_until'];
      base.front_accent_color = '#7c3aed';
      base.back_enabled = true;
      base.back_fields = ['contract_validity', 'company_contact'];
      break;
  }

  return base;
}

export default function IDCardSettings() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const lang = isRTL ? 'ar' : 'en';
  
  const { data: profile, isLoading: profileLoading } = useCachedProfile();
  const tenantId = profile?.tenant_id;

  const [activeTab, setActiveTab] = useState<IDCardType>('visitor');
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [liveSettings, setLiveSettings] = useState<Partial<TenantIDCardSettings>>({});

  // Fetch settings for all card types
  const { 
    allSettings, 
    isLoading: settingsLoading, 
    saveSettings, 
    isSaving 
  } = useIDCardSettings({ tenantId });

  const { duplicateSettings, isDuplicating } = useDuplicateIDCardSettings();

  // Get current settings for active tab
  const currentSettings = allSettings?.find(s => s.card_type === activeTab) || getDefaultSettings(activeTab);

  // Initialize live settings when tab changes or settings load
  useEffect(() => {
    setLiveSettings(currentSettings);
  }, [activeTab, JSON.stringify(currentSettings)]);

  // Tenant data for preview
  const tenantData = {
    id: tenantId || '',
    name: 'Company Name',
    nameAr: 'Ø§Ø³Ù… Ø§Ù„Ø´Ø±ÙƒØ©',
    logoUrl: '',
    hsseDepartmentName: 'HSSE Department',
    hsseDepartmentNameAr: 'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØµØ­Ø© ÙˆØ§Ù„Ø³Ù„Ø§Ù…Ø©',
  };

  const handleSave = useCallback((values: Partial<TenantIDCardSettings>) => {
    if (!tenantId) {
      toast.error(t("common.error", "Error"));
      return;
    }
    
    saveSettings({
      ...values,
      tenant_id: tenantId,
      card_type: activeTab,
    });
  }, [tenantId, activeTab, saveSettings]);

  const handleReset = useCallback(() => {
    const defaults = getDefaultSettings(activeTab);
    setLiveSettings(defaults);
    toast.info(t("idCard.settings.resetInfo", "Settings reset to defaults. Click Save to apply."));
  }, [activeTab, t]);

  const handleDuplicate = useCallback(async (options: DuplicateOptions) => {
    if (!tenantId) return;
    
    await duplicateSettings({
      tenantId,
      sourceCardType: options.sourceCardType,
      targetCardType: activeTab,
      includeFields: options.includeFields,
      includeColors: options.includeColors,
      includeBackSettings: options.includeBackSettings,
      includeBranding: options.includeBranding,
    });
  }, [tenantId, activeTab, duplicateSettings]);

  const handleSettingsChange = useCallback((values: Partial<TenantIDCardSettings>) => {
    setLiveSettings(prev => ({ ...prev, ...values }));
  }, []);

  const isLoading = profileLoading || settingsLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin">
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            {t("idCard.settings.title", "ID Card Settings")}
          </h1>
          <p className="text-muted-foreground">
            {t("idCard.settings.description", "Configure ID card designs for visitors, workers, and employees")}
          </p>
        </div>
      </div>

      {/* Card Type Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as IDCardType)}>
        <TabsList className="grid w-full grid-cols-5">
          {CARD_TYPES.map((type) => (
            <TabsTrigger key={type} value={type} className="text-xs sm:text-sm">
              {CARD_TYPE_LABELS[type][lang]}
            </TabsTrigger>
          ))}
        </TabsList>

        {CARD_TYPES.map((type) => (
          <TabsContent key={type} value={type} className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Settings Form */}
              <div className="order-2 lg:order-1">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {t("idCard.settings.configureCard", "Configure {{cardType}} Card", {
                        cardType: CARD_TYPE_LABELS[type][lang],
                      })}
                    </CardTitle>
                    <CardDescription>
                      {t("idCard.settings.configureDesc", "Customize the appearance and fields for this card type")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <IDCardSettingsForm
                      settings={liveSettings}
                      cardType={type}
                      onSave={handleSave}
                      onReset={handleReset}
                      onDuplicateClick={() => setShowDuplicateDialog(true)}
                      onChange={handleSettingsChange}
                      isSaving={isSaving}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Live Preview */}
              <div className="order-1 lg:order-2 lg:sticky lg:top-6 lg:self-start">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("idCard.preview.title", "Live Preview")}</CardTitle>
                    <CardDescription>
                      {t("idCard.preview.description", "See changes in real-time as you configure")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <IDCardLivePreview
                      settings={liveSettings as TenantIDCardSettings}
                      tenantData={tenantData}
                      cardType={type}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Duplicate Settings Dialog */}
      <DuplicateSettingsDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        currentCardType={activeTab}
        onDuplicate={handleDuplicate}
        isLoading={isDuplicating}
      />
    </div>
  );
}

