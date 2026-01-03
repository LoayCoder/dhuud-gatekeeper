import { useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { 
  User, 
  Building2, 
  Clock, 
  HardHat,
  Shield, 
  Phone,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Share2
} from "lucide-react";


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
  tenant_branding?: {
    logo_light_url: string | null;
    brand_color: string | null;
    hsse_department_name: string | null;
    hsse_department_name_ar: string | null;
  } | null;
  settings: {
    allow_download: boolean;
    allow_share: boolean;
  };
}

export default function WorkerAccessPass() {
  const { token } = useParams<{ token: string }>();
  const badgeRef = useRef<HTMLDivElement>(null);

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

  // Get language and RTL from API response
  const language = accessData?.language || 'en';
  const isRTL = language === 'ar' || language === 'ur';
  const content = accessData?.page_content;

  // Helper function to get content from page_content with English fallback
  const getContent = (key: keyof PageContent, fallbackEn: string): string => {
    return content?.[key] || fallbackEn;
  };

  const handleDownload = async () => {
    if (!badgeRef.current) return;
    
    try {
      const canvas = await html2canvas(badgeRef.current, {
        scale: 2,
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
        await navigator.share({
          title: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed, copy to clipboard as fallback
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          toast.success('Link copied to clipboard');
        }
      }
    } else {
      // Fallback: copy to clipboard
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
  const settings = accessData.settings;

  const hsseInstructions = isRTL 
    ? project.hsse_instructions_ar || project.hsse_instructions_en
    : project.hsse_instructions_en || project.hsse_instructions_ar;

  // Get HSSE department name
  const getHsseDeptName = () => {
    if (isRTL && branding?.hsse_department_name_ar) {
      return branding.hsse_department_name_ar;
    }
    return branding?.hsse_department_name || 'HSSE Department';
  };

  // QR code value format for gate scanner
  const qrValue = `WORKER:${accessData.qr_token}`;

  // Dynamic header color based on brand color
  const headerStyle = branding?.brand_color ? {
    backgroundColor: branding.brand_color,
  } : {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-md mx-auto space-y-4">
        {/* Header Card with QR */}
        <Card className="overflow-hidden" ref={badgeRef}>
          <div 
            className="bg-primary text-primary-foreground p-4 text-center"
            style={headerStyle}
          >
            {/* Tenant Logo */}
            {branding?.logo_light_url ? (
              <img 
                src={branding.logo_light_url} 
                alt={project.tenant_name || 'Company'} 
                className="h-12 mx-auto mb-2 object-contain"
              />
            ) : (
              <HardHat className="h-8 w-8 mx-auto mb-2" />
            )}
            <h1 className="text-xl font-bold">
              {getContent('title', 'Worker Access Pass')}
            </h1>
            <p className="text-primary-foreground/80 text-sm">
              {project.tenant_name || 'Facility'}
            </p>
            {/* HSSE Department Name */}
            <p className="text-primary-foreground/70 text-xs mt-1">
              {getHsseDeptName()}
            </p>
          </div>
          
          <CardContent className="pt-6">
            {/* Status Badge */}
            <div className="flex justify-center mb-4">
              {accessData.is_revoked ? (
                <Badge variant="destructive" className="text-sm px-4 py-1">
                  <XCircle className="h-4 w-4 me-1" />
                  {getContent('status_revoked', 'Revoked')}
                </Badge>
              ) : isExpired ? (
                <Badge variant="secondary" className="text-sm px-4 py-1 bg-amber-500 text-white hover:bg-amber-600">
                  <AlertTriangle className="h-4 w-4 me-1" />
                  {getContent('status_expired', 'Expired')}
                </Badge>
              ) : (
                <Badge variant="default" className="text-sm px-4 py-1 bg-green-500 hover:bg-green-600">
                  <CheckCircle2 className="h-4 w-4 me-1" />
                  {getContent('status_active', 'Active')}
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
                    {getContent('worker_name_label', 'Worker Name')}
                  </p>
                  <p className="font-medium">{worker.full_name}</p>
                </div>
              </div>


              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Building2 className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {getContent('company_label', 'Company')}
                  </p>
                  <p className="font-medium">{worker.company_name || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <HardHat className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {getContent('project_label', 'Project')}
                  </p>
                  <p className="font-medium">{project.project_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Clock className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    {getContent('valid_until_label', 'Valid Until')}
                  </p>
                  <p className={`font-medium ${isExpired ? 'text-destructive' : ''}`}>
                    {format(new Date(accessData.valid_until), 'PPp')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {(settings.allow_download || settings.allow_share) && (
          <div className="flex gap-2">
            {settings.allow_download && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 me-2" />
                {getContent('save_pass', 'Save Pass')}
              </Button>
            )}
            {settings.allow_share && (
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
