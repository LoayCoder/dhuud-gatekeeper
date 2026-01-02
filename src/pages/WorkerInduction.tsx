import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { PageLoader } from '@/components/ui/page-loader';
import { CheckCircle2, AlertCircle, Play, Clock, Building2, User, ExternalLink, Download, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface InductionData {
  id: string;
  worker_name: string;
  worker_name_ar?: string;
  project_name?: string;
  video_title: string;
  video_title_ar?: string;
  video_url: string;
  duration_seconds: number;
  status: string;
  expires_at: string;
  acknowledged_at?: string;
  language: string;
  // Tenant branding
  tenant_name?: string;
  tenant_logo_url?: string;
  brand_color?: string;
  hsse_department_name?: string;
  hsse_department_name_ar?: string;
  // Settings
  settings?: {
    allow_download: boolean;
    allow_share: boolean;
  };
}

interface AcknowledgeResponse {
  success: boolean;
  message?: string;
  error?: string;
  acknowledged_at?: string;
  id_card?: {
    url: string;
    qr_token: string;
  } | null;
}

export default function WorkerInduction() {
  const { inductionId } = useParams<{ inductionId: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inductionData, setInductionData] = useState<InductionData | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [success, setSuccess] = useState(false);
  const [videoWatched, setVideoWatched] = useState(false);
  const [idCardUrl, setIdCardUrl] = useState<string | null>(null);
  const certificateRef = useRef<HTMLDivElement>(null);

  // Detect language from induction data or browser
  const isArabic = inductionData?.language === 'ar' || 
    (!inductionData && navigator.language.startsWith('ar'));

  useEffect(() => {
    if (inductionId) {
      fetchInductionData();
    }
  }, [inductionId]);

  const fetchInductionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.functions.invoke('get-worker-induction', {
        body: { inductionId }
      });

      if (fetchError) throw fetchError;
      
      if (data.error) {
        setError(data.error);
        return;
      }

      setInductionData(data);
      
      // If already completed, show success state
      if (data.status === 'completed' || data.acknowledged_at) {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Error fetching induction:', err);
      setError(isArabic ? 'فشل في تحميل بيانات التدريب' : 'Failed to load induction data');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!acknowledged || !inductionId) return;

    try {
      setSubmitting(true);
      
      const { data, error: ackError } = await supabase.functions.invoke<AcknowledgeResponse>('acknowledge-induction', {
        body: { inductionId }
      });

      if (ackError) throw ackError;
      
      if (data?.error) {
        setError(data.error);
        return;
      }

      // Check if ID card was generated
      if (data?.id_card?.url) {
        setIdCardUrl(data.id_card.url);
      }

      setSuccess(true);
    } catch (err) {
      console.error('Error acknowledging induction:', err);
      setError(isArabic ? 'فشل في تأكيد الإقرار' : 'Failed to submit acknowledgment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadCertificate = async () => {
    if (!certificateRef.current) return;
    
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
      });
      
      const link = document.createElement('a');
      link.download = `induction-certificate-${inductionData?.worker_name || 'certificate'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success(isArabic ? 'تم حفظ الشهادة بنجاح' : 'Certificate saved successfully');
    } catch (err) {
      console.error('Download failed:', err);
      toast.error(isArabic ? 'فشل في حفظ الشهادة' : 'Failed to save certificate');
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = isArabic 
      ? `شهادة إتمام التدريب: ${inductionData?.worker_name}`
      : `Induction Completion: ${inductionData?.worker_name}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          toast.success(isArabic ? 'تم نسخ الرابط' : 'Link copied to clipboard');
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(isArabic ? 'تم نسخ الرابط' : 'Link copied to clipboard');
    }
  };

  const getEmbedUrl = (url: string): string => {
    // Convert YouTube URLs to embed format
    if (url.includes('youtube.com/watch')) {
      const videoId = new URL(url).searchParams.get('v');
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    // Convert Vimeo URLs to embed format
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    return isArabic ? `${mins} دقيقة` : `${mins} min`;
  };

  // Get HSSE department name based on language
  const getHsseDeptName = () => {
    if (isArabic) {
      return inductionData?.hsse_department_name_ar || inductionData?.hsse_department_name || 'قسم الصحة والسلامة';
    }
    return inductionData?.hsse_department_name || 'HSSE Department';
  };

  // Apply brand color if available
  const brandStyle = inductionData?.brand_color ? {
    '--brand-color': inductionData.brand_color,
  } as React.CSSProperties : {};

  if (loading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={isArabic ? 'rtl' : 'ltr'}>
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {isArabic ? 'خطأ' : 'Error'}
            </h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    const settings = inductionData?.settings || { allow_download: true, allow_share: true };
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={isArabic ? 'rtl' : 'ltr'}>
        <Card className="w-full max-w-md" ref={certificateRef}>
          {/* Tenant Branding Header */}
          {inductionData?.tenant_logo_url && (
            <div 
              className="p-4 text-center border-b"
              style={inductionData?.brand_color ? { backgroundColor: `${inductionData.brand_color}10` } : {}}
            >
              <img 
                src={inductionData.tenant_logo_url} 
                alt={inductionData.tenant_name || 'Company'} 
                className="h-12 mx-auto object-contain"
              />
            </div>
          )}
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {isArabic ? 'تم بنجاح!' : 'Success!'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {isArabic 
                ? 'تم إكمال تدريب السلامة بنجاح. يمكنك الآن بدء العمل.'
                : 'Safety induction completed successfully. You can now start work.'}
            </p>
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 mt-4">
              <p className="text-sm text-green-700 dark:text-green-300">
                {isArabic 
                  ? `العامل: ${inductionData?.worker_name_ar || inductionData?.worker_name}`
                  : `Worker: ${inductionData?.worker_name}`}
              </p>
              {inductionData?.project_name && (
                <p className="text-sm text-green-700 dark:text-green-300">
                  {isArabic ? `المشروع: ${inductionData.project_name}` : `Project: ${inductionData.project_name}`}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {(settings.allow_download || settings.allow_share) && (
              <div className="flex gap-2 mt-6">
                {settings.allow_download && (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleDownloadCertificate}
                  >
                    <Download className="h-4 w-4 me-2" />
                    {isArabic ? 'حفظ الشهادة' : 'Save Certificate'}
                  </Button>
                )}
                {settings.allow_share && (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4 me-2" />
                    {isArabic ? 'مشاركة' : 'Share'}
                  </Button>
                )}
              </div>
            )}

            {/* ID Card notification */}
            {idCardUrl && (
              <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm text-foreground mb-3">
                  {isArabic 
                    ? '🆔 تم إرسال بطاقة الهوية الخاصة بك عبر WhatsApp/البريد الإلكتروني'
                    : '🆔 Your ID Card has been sent via WhatsApp/Email'}
                </p>
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => window.open(idCardUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 me-2" />
                  {isArabic ? 'عرض بطاقة الهوية الآن' : 'View ID Card Now'}
                </Button>
              </div>
            )}

            {/* No ID card message */}
            {!idCardUrl && (
              <p className="mt-4 text-xs text-muted-foreground">
                {isArabic 
                  ? 'سيتم إرسال بطاقة الهوية بعد الموافقة على طلبك'
                  : 'ID card will be sent after your approval is confirmed'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!inductionData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={isArabic ? 'rtl' : 'ltr'}>
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {isArabic ? 'لم يتم العثور على التدريب' : 'Induction Not Found'}
            </h2>
            <p className="text-muted-foreground">
              {isArabic 
                ? 'رابط التدريب غير صالح أو منتهي الصلاحية.'
                : 'This induction link is invalid or has expired.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4" dir={isArabic ? 'rtl' : 'ltr'} style={brandStyle}>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Tenant Branding Header */}
        {(inductionData.tenant_logo_url || inductionData.tenant_name) && (
          <Card className="overflow-hidden">
            <div 
              className="p-4 text-center"
              style={inductionData.brand_color ? { backgroundColor: `${inductionData.brand_color}15` } : {}}
            >
              {inductionData.tenant_logo_url && (
                <img 
                  src={inductionData.tenant_logo_url} 
                  alt={inductionData.tenant_name || 'Company'} 
                  className="h-14 mx-auto object-contain mb-2"
                />
              )}
              {inductionData.tenant_name && (
                <h1 className="text-lg font-bold text-foreground">{inductionData.tenant_name}</h1>
              )}
              <p className="text-sm text-muted-foreground">{getHsseDeptName()}</p>
            </div>
          </Card>
        )}

        {/* Induction Header */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              {isArabic ? 'تدريب السلامة' : 'Safety Induction'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium">
                {isArabic ? (inductionData.worker_name_ar || inductionData.worker_name) : inductionData.worker_name}
              </span>
            </div>
            {inductionData.project_name && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span>{inductionData.project_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>{formatDuration(inductionData.duration_seconds)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Video Player */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {isArabic ? (inductionData.video_title_ar || inductionData.video_title) : inductionData.video_title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <iframe
                src={getEmbedUrl(inductionData.video_url)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => setVideoWatched(true)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Acknowledgment Section */}
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-primary">
              {isArabic ? 'إقرار السلامة' : 'Safety Acknowledgment'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {isArabic 
                  ? 'يرجى مشاهدة الفيديو بالكامل ثم الموافقة على الشروط أدناه.'
                  : 'Please watch the entire video and then agree to the terms below.'}
              </p>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
                className="mt-1"
              />
              <label 
                htmlFor="acknowledge" 
                className={cn(
                  "text-sm cursor-pointer select-none",
                  acknowledged ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {isArabic 
                  ? 'أقر بأنني شاهدت فيديو السلامة بالكامل وأفهم جميع إجراءات السلامة المطلوبة وأوافق على الالتزام بها.'
                  : 'I confirm that I have watched the entire safety video, understand all required safety procedures, and agree to comply with them.'}
              </label>
            </div>

            <Button
              onClick={handleAcknowledge}
              disabled={!acknowledged || submitting}
              className="w-full"
              size="lg"
            >
              {submitting 
                ? (isArabic ? 'جارٍ الإرسال...' : 'Submitting...') 
                : (isArabic ? 'تأكيد الإقرار' : 'Confirm Acknowledgment')}
            </Button>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground">
          {isArabic 
            ? 'هذا التدريب مطلوب للسلامة في موقع العمل'
            : 'This induction is required for workplace safety compliance'}
        </p>
      </div>
    </div>
  );
}
