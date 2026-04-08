import { useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Share2,
  Shield, 
  Phone,
} from "lucide-react";
import { IDCardTemplate } from "@/features/admin/components/id-cards/IDCardTemplate/IDCardTemplate";
import { DEFAULT_CARD_SETTINGS } from "@/types/id-card.types";
import type { TenantIDCardSettings, IDCardPersonData, IDCardTenantData } from "@/types/id-card.types";

interface PageContent {
  title?: string;
  subtitle?: string;
  worker_name_label?: string;
  company_label?: string;
  project_label?: string;
  valid_until_label?: string;
  status_active?: string;
  status_revoked?: string;
  status_expired?: string;
  safety_title?: string;
  emergency_title?: string;
  qr_instruction?: string;
  save_pass?: string;
  share?: string;
}

interface WorkerAccessData {
  qr_token: string;
  valid_until: string;
  is_revoked: boolean;
  created_at: string;
  language: string;
  page_content: PageContent | null;
  worker: {
    full_name: string;
    full_name_ar: string | null;
    nationality: string | null;
    company_name: string | null;
    company_name_ar: string | null;
    worker_type: string | null;
    role: string | null;
    role_ar: string | null;
    employee_id: string | null;
    national_id: string | null;
    photo_url: string | null;
  };
  project: {
    project_name: string;
    project_name_ar: string | null;
    tenant_name: string | null;
    hsse_instructions_ar: string | null;
    hsse_instructions_en: string | null;
    emergency_contact_number: string | null;
    emergency_contact_name: string | null;
  };
  tenant_branding?: {
    logo_light_url: string | null;
    brand_color: string | null;
    hsse_department_name: string | null;
    hsse_department_name_ar: string | null;
  } | null;
  id_card_settings: Record<string, unknown> | null;
  settings: {
    allow_download: boolean;
    allow_share: boolean;
  };
}

/**
 * Build TenantIDCardSettings from API response or use defaults
 */
function buildCardSettings(raw: Record<string, unknown> | null): TenantIDCardSettings {
  const defaults = DEFAULT_CARD_SETTINGS.worker;
  if (!raw) {
    return {
      id: 'default',
      tenant_id: '',
      card_type: 'worker',
      front_bg_color: '#ffffff',
      front_accent_color: defaults.front_accent_color || '#C43718',
      front_text_color: '#1a1a1a',
      show_photo: true,
      show_qr_code: true,
      qr_position: 'right' as const,
      front_fields: defaults.front_fields || ['full_name', 'company', 'role', 'project', 'valid_until'],
      back_enabled: defaults.back_enabled || false,
      back_bg_color: '#ffffff',
      back_fields: defaults.back_fields || [],
      back_custom_text: null,
      back_custom_text_ar: null,
      card_orientation: 'portrait' as const,
      show_logo: true,
      logo_position: 'top-center' as const,
      show_tenant_name: true,
      template_preset: defaults.template_preset || 'safety',
      is_active: true,
      created_at: '',
      updated_at: '',
    } as TenantIDCardSettings;
  }
  return raw as unknown as TenantIDCardSettings;
}

export default function WorkerAccessPass() {
  const { token } = useParams<{ token: string }>();
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: accessData, isLoading, error } = useQuery({
    queryKey: ['worker-access-pass', token],
    queryFn: async () => {
      if (!token) throw new Error('No token provided');
      const { data, error } = await supabase.functions.invoke('get-worker-access-pass', {
        body: { token }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as WorkerAccessData;
    },
    enabled: !!token,
  });

  const language = accessData?.language || 'en';
  const isRTL = language === 'ar' || language === 'ur';
  const content = accessData?.page_content;
  const cardLang = (language === 'ar' || language === 'ur') ? 'ar' : 'en';

  const getContent = (key: keyof PageContent, fallbackEn: string): string => {
    return content?.[key] || fallbackEn;
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `worker-pass-${accessData?.worker.full_name || 'badge'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success(getContent('save_pass', 'Pass saved successfully'));
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to save pass');
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `${getContent('title', 'Worker Access Pass')}: ${accessData?.worker.full_name}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, url: shareUrl });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Link copied to clipboard');
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-8 w-48 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-48 w-48 mx-auto" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !accessData) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card className="w-full max-w-md border-destructive">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-destructive mb-2">
              Invalid Access Pass
            </h2>
            <p className="text-muted-foreground">
              Worker access pass not found or has been revoked
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(accessData.valid_until) < new Date();
  const isActive = !accessData.is_revoked && !isExpired;
  const worker = accessData.worker;
  const project = accessData.project;
  const branding = accessData.tenant_branding;
  const pageSettings = accessData.settings;

  const hsseInstructions = isRTL 
    ? project.hsse_instructions_ar || project.hsse_instructions_en
    : project.hsse_instructions_en || project.hsse_instructions_ar;

  // Build IDCardTemplate props
  const cardSettings = buildCardSettings(accessData.id_card_settings);

  const personData: IDCardPersonData = {
    id: accessData.qr_token,
    fullName: worker.full_name,
    fullNameAr: worker.full_name_ar || undefined,
    photo: worker.photo_url || undefined,
    role: worker.role || worker.worker_type || undefined,
    roleAr: worker.role_ar || undefined,
    company: worker.company_name || undefined,
    companyAr: worker.company_name_ar || undefined,
    employeeId: worker.employee_id || undefined,
    nationalId: worker.national_id || undefined,
    project: project.project_name,
    projectAr: project.project_name_ar || undefined,
    validUntil: accessData.valid_until,
    qrToken: accessData.qr_token,
    qrUrl: `WORKER:${accessData.qr_token}`,
    emergencyContact: project.emergency_contact_number || undefined,
    safetyInstructions: hsseInstructions || undefined,
  };

  const tenantData: IDCardTenantData = {
    id: '',
    name: project.tenant_name || 'Facility',
    nameAr: undefined,
    logoUrl: branding?.logo_light_url || undefined,
    hsseDepartmentName: branding?.hsse_department_name || undefined,
    hsseDepartmentNameAr: branding?.hsse_department_name_ar || undefined,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-md mx-auto space-y-4">
        {/* Status Badge */}
        <div className="flex justify-center">
          {accessData.is_revoked ? (
            <Badge variant="destructive" className="text-sm px-4 py-1.5">
              <XCircle className="h-4 w-4 me-1" />
              {getContent('status_revoked', 'Revoked')}
            </Badge>
          ) : isExpired ? (
            <Badge variant="secondary" className="text-sm px-4 py-1.5 bg-amber-500 text-white hover:bg-amber-600">
              <AlertTriangle className="h-4 w-4 me-1" />
              {getContent('status_expired', 'Expired')}
            </Badge>
          ) : (
            <Badge variant="default" className="text-sm px-4 py-1.5 bg-green-500 hover:bg-green-600">
              <CheckCircle2 className="h-4 w-4 me-1" />
              {getContent('status_active', 'Active')}
            </Badge>
          )}
        </div>

        {/* ID Card - New Template */}
        <div className={`flex justify-center ${!isActive ? 'opacity-60' : ''}`}>
          <div ref={cardRef}>
            <IDCardTemplate
              cardType="worker"
              personData={personData}
              tenantData={tenantData}
              settings={cardSettings}
              side="front"
              language={cardLang as 'en' | 'ar'}
              scale={1.2}
            />
          </div>
        </div>

        {/* Action Buttons */}
        {(pageSettings.allow_download || pageSettings.allow_share) && (
          <div className="flex gap-2">
            {pageSettings.allow_download && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 me-2" />
                {getContent('save_pass', 'Save Pass')}
              </Button>
            )}
            {pageSettings.allow_share && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 me-2" />
                {getContent('share', 'Share')}
              </Button>
            )}
          </div>
        )}

        {/* Safety Instructions Card */}
        {hsseInstructions && (
          <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Shield className="h-5 w-5" />
                {getContent('safety_title', 'Safety Instructions')}
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
        {project.emergency_contact_number && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-4">
              <a 
                href={`tel:${project.emergency_contact_number}`}
                className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors"
              >
                <Phone className="h-5 w-5 text-destructive shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-destructive/70">
                    {getContent('emergency_title', 'Emergency Contact')}
                  </p>
                  <p className="font-bold text-destructive">
                    {project.emergency_contact_number}
                  </p>
                  {project.emergency_contact_name && (
                    <p className="text-xs text-destructive/70">
                      {project.emergency_contact_name}
                    </p>
                  )}
                </div>
              </a>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pt-2">
          {getContent('qr_instruction', 'Please present this QR code at the gate for entry')}
        </p>
      </div>
    </div>
  );
}
