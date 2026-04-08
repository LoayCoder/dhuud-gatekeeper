import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { 
  Shield, 
  Phone,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Share2,
} from "lucide-react";

import { useState, useRef } from "react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { VisitorEmergencyButton } from '@/features/security';
import { IDCardTemplate } from "@/features/admin/components/id-cards/IDCardTemplate";
import type { IDCardPersonData, IDCardTenantData, TenantIDCardSettings, IDCardType } from "@/types/id-card.types";
import { DEFAULT_CARD_SETTINGS } from "@/types/id-card.types";

interface VisitorBadgeData {
  visitor_name: string;
  company_name: string | null;
  national_id: string | null;
  phone: string | null;
  host_name: string | null;
  destination: string | null;
  valid_from: string;
  valid_until: string;
  qr_token: string;
  status: string;
  is_active: boolean;
  is_vip?: boolean;
  language: string;
  page_content: Record<string, string> | null;
  tenant_id?: string;
  tenant_branding: {
    id?: string;
    name: string;
    short_name?: string | null;
    logo_light_url: string | null;
    logo_dark_url: string | null;
    brand_color: string | null;
    hsse_department_name: string | null;
    hsse_department_name_ar: string | null;
    visitor_hsse_instructions_en: string | null;
    visitor_hsse_instructions_ar: string | null;
    emergency_contact_number: string | null;
    emergency_contact_name: string | null;
  } | null;
  settings: {
    allow_download: boolean;
    allow_share: boolean;
  };
}

export default function VisitorBadgePage() {
  const { token } = useParams<{ token: string }>();
  const badgeRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const { data: badgeData, isLoading, error } = useQuery({
    queryKey: ['visitor-badge', token],
    queryFn: async () => {
      if (!token) throw new Error('No token provided');
      
      const { data, error } = await supabase.functions.invoke('get-visitor-badge', {
        body: { token }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data as VisitorBadgeData;
    },
    enabled: !!token,
  });

  const language = badgeData?.language || 'en';
  const isRTL = language === 'ar' || language === 'ur';
  const branding = badgeData?.tenant_branding;

  // Determine card type
  const cardType: IDCardType = badgeData?.is_vip ? 'visitor_vip' : 'visitor';
  const tenantId = badgeData?.tenant_id || branding?.id || '';

  // Fetch tenant ID card settings
  const { data: cardSettings } = useQuery({
    queryKey: ['id-card-settings-visitor-badge', tenantId, cardType],
    queryFn: async () => {
      const { data } = await supabase
        .from('tenant_id_card_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('card_type', cardType)
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle();
      return data;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const handleDownload = async () => {
    if (!badgeRef.current || !badgeData) return;
    
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(badgeRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      
      const link = document.createElement('a');
      link.download = `visitor-badge-${badgeData.visitor_name.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success(isRTL ? 'تم حفظ البطاقة' : 'Badge saved');
    } catch (err) {
      console.error('Download error:', err);
      toast.error(isRTL ? 'فشل في حفظ البطاقة' : 'Failed to save badge');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!badgeRef.current || !badgeData) return;
    
    setIsSharing(true);
    try {
      const canvas = await html2canvas(badgeRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });
      
      const file = new File([blob], `visitor-badge-${badgeData.visitor_name}.png`, { 
        type: 'image/png' 
      });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: isRTL ? 'بطاقة الزائر' : 'Visitor Badge',
          text: isRTL 
            ? `بطاقة زيارة لـ ${badgeData.visitor_name}` 
            : `Visitor badge for ${badgeData.visitor_name}`,
          files: [file],
        });
        toast.success(isRTL ? 'تمت المشاركة بنجاح' : 'Shared successfully');
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied to clipboard');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share error:', err);
        toast.error(isRTL ? 'فشل في المشاركة' : 'Failed to share');
      }
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-48 w-48 mx-auto" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !badgeData) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card className="w-full max-w-md border-destructive">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-destructive mb-2">
              {isRTL ? 'بطاقة غير صالحة' : 'Invalid Badge'}
            </h2>
            <p className="text-muted-foreground">
              {isRTL 
                ? 'لم يتم العثور على بطاقة الزائر أو انتهت صلاحيتها'
                : 'Visitor badge not found or has expired'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(badgeData.valid_until) < new Date();
  const hsseInstructions = isRTL 
    ? branding?.visitor_hsse_instructions_ar || branding?.visitor_hsse_instructions_en
    : branding?.visitor_hsse_instructions_en || branding?.visitor_hsse_instructions_ar;

  // Build IDCard data
  const personData: IDCardPersonData = {
    id: badgeData.qr_token,
    fullName: badgeData.visitor_name,
    company: badgeData.company_name || undefined,
    hostName: badgeData.host_name || undefined,
    destination: badgeData.destination || undefined,
    validUntil: badgeData.valid_until,
    nationalId: badgeData.national_id || undefined,
    qrToken: badgeData.qr_token,
    qrUrl: `VISITOR:${badgeData.qr_token}`,
  };

  const tenantDataForCard: IDCardTenantData = {
    id: tenantId,
    name: branding?.name || '',
    nameAr: branding?.short_name || undefined,
    logoUrl: branding?.logo_light_url || undefined,
    hsseDepartmentName: branding?.hsse_department_name || undefined,
    hsseDepartmentNameAr: branding?.hsse_department_name_ar || undefined,
  };

  const brandAccent = branding?.brand_color || '#3F434C';
  const defaults = DEFAULT_CARD_SETTINGS[cardType];
  const settings: TenantIDCardSettings = cardSettings ? {
    ...cardSettings,
    front_fields: cardSettings.front_fields || defaults.front_fields,
    back_fields: cardSettings.back_fields || defaults.back_fields,
  } as TenantIDCardSettings : {
    id: '',
    tenant_id: tenantId,
    card_type: cardType,
    front_bg_color: '#FFFFFF',
    front_accent_color: brandAccent,
    front_text_color: '#1f2937',
    show_photo: false,
    show_qr_code: true,
    qr_position: 'right',
    front_fields: defaults.front_fields || ['full_name', 'company', 'destination', 'host_name', 'valid_until'],
    back_enabled: false,
    back_bg_color: '#f3f4f6',
    back_fields: defaults.back_fields || [],
    back_custom_text: null,
    back_custom_text_ar: null,
    card_orientation: 'portrait',
    show_logo: true,
    logo_position: 'top-left',
    show_tenant_name: true,
    template_preset: defaults.template_preset || 'standard',
    is_active: true,
    created_at: '',
    updated_at: '',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-md mx-auto space-y-4">
        {/* Status Badge */}
        <div className="flex justify-center">
          {!badgeData.is_active ? (
            isExpired ? (
              <Badge variant="secondary" className="text-sm px-4 py-1 bg-amber-500 text-white hover:bg-amber-600">
                <AlertTriangle className="h-4 w-4 me-1" />
                {isRTL ? 'منتهي الصلاحية' : 'Expired'}
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-sm px-4 py-1">
                <XCircle className="h-4 w-4 me-1" />
                {isRTL ? 'غير نشط' : 'Inactive'}
              </Badge>
            )
          ) : (
            <Badge variant="default" className="text-sm px-4 py-1 bg-green-500 hover:bg-green-600">
              <CheckCircle2 className="h-4 w-4 me-1" />
              {isRTL ? 'نشط' : 'Active'}
            </Badge>
          )}
        </div>

        {/* ID Card using IDCardTemplate */}
        <div ref={badgeRef} className="flex justify-center">
          <IDCardTemplate
            cardType={cardType}
            personData={personData}
            tenantData={tenantDataForCard}
            settings={settings}
            side="front"
            language={isRTL ? 'ar' : 'en'}
            scale={1.5}
          />
        </div>

        {/* Safety Instructions Card */}
        {hsseInstructions && (
          <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Shield className="h-5 w-5" />
                {isRTL ? 'تعليمات السلامة' : 'Safety Instructions'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-800 dark:text-amber-300 whitespace-pre-wrap">
                {hsseInstructions}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Emergency Contact Card */}
        {branding?.emergency_contact_number && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-4">
              <a 
                href={`tel:${branding.emergency_contact_number}`}
                className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors"
              >
                <Phone className="h-5 w-5 text-destructive shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-destructive/70">
                    {isRTL ? 'اتصال طوارئ' : 'Emergency Contact'}
                  </p>
                  <p className="font-bold text-destructive">
                    {branding.emergency_contact_number}
                  </p>
                  {branding.emergency_contact_name && (
                    <p className="text-xs text-destructive/70">
                      {branding.emergency_contact_name}
                    </p>
                  )}
                </div>
              </a>
            </CardContent>
          </Card>
        )}

        {/* Emergency Button */}
        <div className="fixed bottom-4 inset-x-4 max-w-md mx-auto z-50">
          <VisitorEmergencyButton
            visitorToken={badgeData.qr_token}
            visitorName={badgeData.visitor_name}
            emergencyContact={branding?.emergency_contact_number || undefined}
            className="w-full"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pb-20">
          {badgeData.settings.allow_download && (
            <Button 
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1"
              variant="outline"
            >
              <Download className="h-4 w-4 me-2" />
              {isDownloading 
                ? (isRTL ? 'جاري الحفظ...' : 'Saving...') 
                : (isRTL ? 'حفظ البطاقة' : 'Save Badge')}
            </Button>
          )}
          
          {badgeData.settings.allow_share && (
            <Button 
              onClick={handleShare}
              disabled={isSharing}
              className="flex-1"
            >
              <Share2 className="h-4 w-4 me-2" />
              {isSharing 
                ? (isRTL ? 'جاري المشاركة...' : 'Sharing...') 
                : (isRTL ? 'مشاركة' : 'Share')}
            </Button>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pt-2">
          {isRTL 
            ? 'يرجى إظهار رمز QR هذا عند البوابة للدخول'
            : 'Please present this QR code at the gate for entry'}
        </p>
      </div>
    </div>
  );
}
