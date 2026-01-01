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
  HardHat,
  Shield, 
  Phone,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface WorkerAccessData {
  qr_token: string;
  valid_until: string;
  is_revoked: boolean;
  created_at: string;
  worker: {
    full_name: string;
    nationality: string | null;
    company_name: string | null;
  };
  project: {
    project_name: string;
    tenant_name: string | null;
    hsse_instructions_ar: string | null;
    hsse_instructions_en: string | null;
    emergency_contact_number: string | null;
    emergency_contact_name: string | null;
  };
}

export default function WorkerAccessPass() {
  const { token } = useParams<{ token: string }>();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar' || i18n.language === 'ur';

  const { data: accessData, isLoading, error } = useQuery({
    queryKey: ['worker-access-pass', token],
    queryFn: async () => {
      if (!token) throw new Error('No token provided');
      
      // Call edge function to bypass RLS (workers are unauthenticated)
      const { data, error } = await supabase.functions.invoke('get-worker-access-pass', {
        body: { token }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data as WorkerAccessData;
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

  if (error || !accessData) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card className="w-full max-w-md border-destructive">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-destructive mb-2">
              {isRTL ? 'تصريح غير صالح' : 'Invalid Access Pass'}
            </h2>
            <p className="text-muted-foreground">
              {isRTL 
                ? 'لم يتم العثور على تصريح العامل أو تم إلغاؤه'
                : 'Worker access pass not found or has been revoked'}
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

  const hsseInstructions = isRTL 
    ? project.hsse_instructions_ar || project.hsse_instructions_en
    : project.hsse_instructions_en || project.hsse_instructions_ar;

  // QR code value format for gate scanner
  const qrValue = `WORKER:${accessData.qr_token}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-md mx-auto space-y-4">
        {/* Header Card with QR */}
        <Card className="overflow-hidden">
          <div className="bg-primary text-primary-foreground p-4 text-center">
            <HardHat className="h-8 w-8 mx-auto mb-2" />
            <h1 className="text-xl font-bold">
              {isRTL ? 'تصريح دخول العامل' : 'Worker Access Pass'}
            </h1>
            <p className="text-primary-foreground/80 text-sm">
              {project.tenant_name || (isRTL ? 'المنشأة' : 'Facility')}
            </p>
          </div>
          
          <CardContent className="pt-6">
            {/* Status Badge */}
            <div className="flex justify-center mb-4">
              {accessData.is_revoked ? (
                <Badge variant="destructive" className="text-sm px-4 py-1">
                  <XCircle className="h-4 w-4 me-1" />
                  {isRTL ? 'ملغي' : 'Revoked'}
                </Badge>
              ) : isExpired ? (
                <Badge variant="secondary" className="text-sm px-4 py-1 bg-amber-500 text-white hover:bg-amber-600">
                  <AlertTriangle className="h-4 w-4 me-1" />
                  {isRTL ? 'منتهي الصلاحية' : 'Expired'}
                </Badge>
              ) : (
                <Badge variant="default" className="text-sm px-4 py-1 bg-green-500 hover:bg-green-600">
                  <CheckCircle2 className="h-4 w-4 me-1" />
                  {isRTL ? 'نشط' : 'Active'}
                </Badge>
              )}
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className={`bg-white p-4 rounded-lg shadow-inner ${!isActive ? 'opacity-50' : ''}`}>
                <QRCodeSVG 
                  value={qrValue} 
                  size={180}
                  level="H"
                />
              </div>
            </div>

            {/* Worker Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'اسم العامل' : 'Worker Name'}
                  </p>
                  <p className="font-medium">{worker.full_name}</p>
                </div>
              </div>


              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Building2 className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'الشركة' : 'Company'}
                  </p>
                  <p className="font-medium">{worker.company_name || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <HardHat className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'المشروع' : 'Project'}
                  </p>
                  <p className="font-medium">{project.project_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Clock className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'صالح حتى' : 'Valid Until'}
                  </p>
                  <p className={`font-medium ${isExpired ? 'text-destructive' : ''}`}>
                    {format(new Date(accessData.valid_until), 'PPp')}
                  </p>
                </div>
              </div>
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
                    {isRTL ? 'اتصال طوارئ' : 'Emergency Contact'}
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
          {isRTL 
            ? 'يرجى إظهار رمز QR هذا عند البوابة للدخول'
            : 'Please present this QR code at the gate for entry'}
        </p>
      </div>
    </div>
  );
}
