import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { 
  Shield, 
  Phone,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { IDCardTemplate } from "@/features/admin/components/id-cards/IDCardTemplate";
import type { IDCardPersonData, IDCardTenantData, TenantIDCardSettings } from "@/types/id-card.types";
import { DEFAULT_CARD_SETTINGS } from "@/types/id-card.types";

interface GateEntryPassData {
  id: string;
  visitor_name: string | null;
  visitor_mobile: string | null;
  destination_name: string | null;
  entry_time: string;
  exit_time: string | null;
  visit_duration_hours: number | null;
  notes: string | null;
  qr_code_token: string | null;
  tenant_id: string | null;
  tenant: {
    id: string;
    name: string;
    short_name?: string | null;
    logo_light_url?: string | null;
    brand_color?: string | null;
    visitor_hsse_instructions_ar?: string | null;
    visitor_hsse_instructions_en?: string | null;
    emergency_contact_number?: string | null;
    emergency_contact_name?: string | null;
  } | null;
}

export default function VisitorPass() {
  const { token } = useParams<{ token: string }>();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const { data: entry, isLoading, error } = useQuery({
    queryKey: ['visitor-pass', token],
    queryFn: async () => {
      if (!token) throw new Error('No token provided');
      
      const { data, error } = await supabase
        .from('gate_entry_logs')
        .select(`
          id,
          visitor_name,
          visitor_mobile,
          destination_name,
          entry_time,
          exit_time,
          visit_duration_hours,
          notes,
          qr_code_token,
          tenant_id,
          tenant:tenants(
            id,
            name,
            short_name,
            logo_light_url,
            brand_color,
            visitor_hsse_instructions_ar,
            visitor_hsse_instructions_en,
            emergency_contact_number,
            emergency_contact_name
          )
        `)
        .eq('qr_code_token', token)
        .is('deleted_at', null)
        .single();
      
      if (error) throw error;
      return data as unknown as GateEntryPassData;
    },
    enabled: !!token,
  });

  // Fetch tenant ID card settings for visitor type
  const tenantId = entry?.tenant_id || entry?.tenant?.id;
  const { data: cardSettings } = useQuery({
    queryKey: ['id-card-settings-visitor', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('tenant_id_card_settings')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('card_type', 'visitor')
        .eq('is_active', true)
        .is('deleted_at', null)
        .maybeSingle();
      return data;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

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

  if (error || !entry) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card className="w-full max-w-md border-destructive">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-destructive mb-2">
              {isRTL ? 'تصريح غير صالح' : 'Invalid Pass'}
            </h2>
            <p className="text-muted-foreground">
              {isRTL 
                ? 'لم يتم العثور على تصريح الزيارة أو انتهت صلاحيته'
                : 'Visitor pass not found or has expired'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = !entry.exit_time;
  const tenant = entry.tenant;

  const hsseInstructions = isRTL 
    ? tenant?.visitor_hsse_instructions_ar || tenant?.visitor_hsse_instructions_en
    : tenant?.visitor_hsse_instructions_en || tenant?.visitor_hsse_instructions_ar;

  // Build IDCard data
  const personData: IDCardPersonData = {
    id: entry.id,
    fullName: entry.visitor_name || '',
    destination: entry.destination_name || undefined,
    entryDate: entry.entry_time,
    qrToken: entry.qr_code_token || token || '',
    qrUrl: `VISITOR:${entry.qr_code_token || token || ''}`,
  };

  const tenantData: IDCardTenantData = {
    id: tenant?.id || tenantId || '',
    name: tenant?.name || '',
    nameAr: tenant?.short_name || undefined,
    logoUrl: tenant?.logo_light_url || undefined,
  };

  const brandAccent = tenant?.brand_color || '#3F434C';
  const settings: TenantIDCardSettings = cardSettings ? {
    ...cardSettings,
    front_fields: cardSettings.front_fields || DEFAULT_CARD_SETTINGS.visitor.front_fields,
    back_fields: cardSettings.back_fields || DEFAULT_CARD_SETTINGS.visitor.back_fields,
  } as TenantIDCardSettings : {
    id: '',
    tenant_id: tenantId || '',
    card_type: 'visitor',
    front_bg_color: '#FFFFFF',
    front_accent_color: brandAccent,
    front_text_color: '#1f2937',
    show_photo: false,
    show_qr_code: true,
    qr_position: 'right',
    front_fields: ['full_name', 'destination', 'entry_date'],
    back_enabled: false,
    back_bg_color: '#f3f4f6',
    back_fields: [],
    back_custom_text: null,
    back_custom_text_ar: null,
    card_orientation: 'portrait',
    show_logo: true,
    logo_position: 'top-left',
    show_tenant_name: true,
    template_preset: 'standard',
    is_active: true,
    created_at: '',
    updated_at: '',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-md mx-auto space-y-4">
        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge 
            variant={isActive ? "default" : "secondary"} 
            className={`text-sm px-4 py-1 ${isActive ? 'bg-green-500 hover:bg-green-600' : ''}`}
          >
            {isActive ? (
              <>
                <CheckCircle2 className="h-4 w-4 me-1" />
                {isRTL ? 'نشط' : 'Active'}
              </>
            ) : (
              isRTL ? 'مغادر' : 'Exited'
            )}
          </Badge>
        </div>

        {/* ID Card using IDCardTemplate */}
        <div className="flex justify-center">
          <IDCardTemplate
            cardType="visitor"
            personData={personData}
            tenantData={tenantData}
            settings={settings}
            side="front"
            language={isRTL ? 'ar' : 'en'}
            scale={1.5}
          />
        </div>

        {/* Visit Duration Info */}
        {entry.visit_duration_hours && (
          <Card>
            <CardContent className="pt-4">
              <div className="text-center text-sm text-muted-foreground">
                {isRTL ? 'مدة الزيارة' : 'Visit Duration'}: {' '}
                <span className="font-medium text-foreground">
                  {entry.visit_duration_hours >= 8 
                    ? (isRTL ? 'يوم كامل' : 'Full day')
                    : `${entry.visit_duration_hours} ${isRTL ? 'ساعة' : 'hour(s)'}`}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {entry.exit_time && (
          <Card>
            <CardContent className="pt-4 text-center text-sm text-muted-foreground">
              {isRTL ? 'وقت المغادرة' : 'Exit Time'}: {' '}
              <span className="font-medium text-foreground">
                {format(new Date(entry.exit_time), 'PPp')}
              </span>
            </CardContent>
          </Card>
        )}

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
        {tenant?.emergency_contact_number && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-4">
              <a 
                href={`tel:${tenant.emergency_contact_number}`}
                className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors"
              >
                <Phone className="h-5 w-5 text-destructive shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-destructive/70">
                    {isRTL ? 'اتصال طوارئ' : 'Emergency Contact'}
                  </p>
                  <p className="font-bold text-destructive">
                    {tenant.emergency_contact_number}
                  </p>
                  {tenant.emergency_contact_name && (
                    <p className="text-xs text-destructive/70">
                      {tenant.emergency_contact_name}
                    </p>
                  )}
                </div>
              </a>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pt-2">
          {isRTL 
            ? 'يرجى إظهار هذا التصريح عند المغادرة'
            : 'Please present this pass upon exit'}
        </p>
      </div>
    </div>
  );
}
