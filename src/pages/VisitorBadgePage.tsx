import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { 
  User, 
  Building2, 
  Clock, 
  Shield, 
  Phone,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Share2,
  MapPin
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useRef } from "react";
import { toast } from "sonner";
import html2canvas from "html2canvas";

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
  tenant_branding: {
    name: string;
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
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar' || i18n.language === 'ur';
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
      
      toast.success(isRTL ? 'تم حفظ البطاقة' : 'Badge saved to gallery');
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
        // Fallback: copy link to clipboard
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
  const branding = badgeData.tenant_branding;
  const hsseInstructions = isRTL 
    ? branding?.visitor_hsse_instructions_ar || branding?.visitor_hsse_instructions_en
    : branding?.visitor_hsse_instructions_en || branding?.visitor_hsse_instructions_ar;

  const qrValue = `VISITOR:${badgeData.qr_token}`;

  const headerStyle = branding?.brand_color ? {
    backgroundColor: branding.brand_color,
  } : {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-md mx-auto space-y-4">
        {/* Main Badge Card */}
        <div ref={badgeRef}>
          <Card className="overflow-hidden">
            <div 
              className="bg-primary text-primary-foreground p-4 text-center"
              style={headerStyle}
            >
              {branding?.logo_light_url ? (
                <img 
                  src={branding.logo_light_url} 
                  alt={branding.name} 
                  className="h-12 mx-auto mb-2 object-contain"
                />
              ) : (
                <User className="h-8 w-8 mx-auto mb-2" />
              )}
              <h1 className="text-xl font-bold">
                {isRTL ? 'بطاقة الزائر' : 'Visitor Badge'}
              </h1>
              <p className="text-primary-foreground/80 text-sm">
                {branding?.name || (isRTL ? 'المنشأة' : 'Facility')}
              </p>
              {branding?.hsse_department_name && (
                <p className="text-primary-foreground/70 text-xs mt-1">
                  {isRTL ? branding.hsse_department_name_ar : branding.hsse_department_name}
                </p>
              )}
            </div>
            
            <CardContent className="pt-6">
              {/* Status Badge */}
              <div className="flex justify-center mb-4">
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

              {/* QR Code */}
              <div className="flex justify-center mb-6">
                <div className={`bg-white p-4 rounded-lg shadow-inner ${!badgeData.is_active ? 'opacity-50' : ''}`}>
                  <QRCodeSVG 
                    value={qrValue} 
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
                    <p className="font-medium">{badgeData.visitor_name}</p>
                  </div>
                </div>

                {badgeData.company_name && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? 'الشركة' : 'Company'}
                      </p>
                      <p className="font-medium">{badgeData.company_name}</p>
                    </div>
                  </div>
                )}

                {badgeData.host_name && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <User className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? 'المضيف' : 'Host'}
                      </p>
                      <p className="font-medium">{badgeData.host_name}</p>
                    </div>
                  </div>
                )}

                {badgeData.destination && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <MapPin className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? 'الوجهة' : 'Destination'}
                      </p>
                      <p className="font-medium">{badgeData.destination}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Clock className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'صالحة حتى' : 'Valid Until'}
                    </p>
                    <p className={`font-medium ${isExpired ? 'text-destructive' : ''}`}>
                      {format(new Date(badgeData.valid_until), 'PPp')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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

        {/* Action Buttons */}
        <div className="flex gap-3">
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
