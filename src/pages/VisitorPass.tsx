import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { 
  User, 
  Building2, 
  Clock, 
  MapPin, 
  Shield, 
  Phone,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { useTranslation } from "react-i18next";

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
  tenant: {
    name: string;
    visitor_hsse_instructions_ar?: string | null;
    visitor_hsse_instructions_en?: string | null;
    emergency_contact_number?: string | null;
    emergency_contact_name?: string | null;
  } | null;
}

export default function VisitorPass() {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation();
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
          tenant:tenants(
            name,
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-md mx-auto space-y-4">
        {/* Header Card with QR */}
        <Card className="overflow-hidden">
          <div className="bg-primary text-primary-foreground p-4 text-center">
            <h1 className="text-xl font-bold">
              {isRTL ? 'تصريح زائر' : 'Visitor Pass'}
            </h1>
            <p className="text-primary-foreground/80 text-sm">
              {tenant?.name || (isRTL ? 'المنشأة' : 'Facility')}
            </p>
          </div>
          
          <CardContent className="pt-6">
            {/* Status Badge */}
            <div className="flex justify-center mb-4">
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

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className="bg-white p-4 rounded-lg shadow-inner">
                <QRCodeSVG 
                  value={entry.qr_code_token || token || ''} 
                  size={180}
                  level="H"
                />
              </div>
            </div>

            {/* Visitor Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'اسم الزائر' : 'Visitor Name'}
                  </p>
                  <p className="font-medium">{entry.visitor_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'الوجهة' : 'Destination'}
                  </p>
                  <p className="font-medium">{entry.destination_name || (isRTL ? 'الاستقبال' : 'Reception')}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Clock className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'وقت الدخول' : 'Entry Time'}
                  </p>
                  <p className="font-medium">
                    {format(new Date(entry.entry_time), 'PPp')}
                  </p>
                </div>
              </div>

              {entry.visit_duration_hours && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'مدة الزيارة' : 'Visit Duration'}
                    </p>
                    <p className="font-medium">
                      {entry.visit_duration_hours >= 8 
                        ? (isRTL ? 'يوم كامل' : 'Full day')
                        : `${entry.visit_duration_hours} ${isRTL ? 'ساعة' : 'hour(s)'}`}
                    </p>
                  </div>
                </div>
              )}

              {entry.exit_time && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'وقت المغادرة' : 'Exit Time'}
                    </p>
                    <p className="font-medium">
                      {format(new Date(entry.exit_time), 'PPp')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
