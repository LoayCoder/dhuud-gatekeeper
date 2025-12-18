import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowRight,
  MapPin, 
  Loader2,
  QrCode,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { usePTWPermit } from '@/hooks/ptw/use-ptw-permits';
import { usePTWRealtime } from '@/hooks/ptw/use-ptw-realtime';
import { PTWMobileChecklist, type ChecklistItem, type ChecklistResponse } from '@/components/ptw/mobile/PTWMobileChecklist';
import { SignaturePad, type SignaturePadRef } from '@/components/ui/signature-pad';
import { PTWRealtimeIndicator } from '@/components/ptw/PTWRealtimeIndicator';
import { PageLoader } from '@/components/ui/page-loader';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

// Sample checklist items - in production these would come from the database
const getChecklistItems = (permitTypeCode: string): ChecklistItem[] => [
  // PPE Items
  { id: 'ppe-1', title: 'Safety Helmet', description: 'Approved hard hat worn correctly', isRequired: true, category: 'ppe' },
  { id: 'ppe-2', title: 'Safety Glasses', description: 'Eye protection appropriate for task', isRequired: true, category: 'ppe' },
  { id: 'ppe-3', title: 'Safety Boots', description: 'Steel-toe boots in good condition', isRequired: true, category: 'ppe' },
  { id: 'ppe-4', title: 'High-Visibility Vest', description: 'Reflective vest visible', isRequired: true, category: 'ppe' },
  { id: 'ppe-5', title: 'Gloves', description: 'Appropriate gloves for task', isRequired: false, category: 'ppe' },
  // Safety Items
  { id: 'safety-1', title: 'Work Area Barricaded', description: 'Area properly cordoned off', isRequired: true, category: 'safety' },
  { id: 'safety-2', title: 'Fire Extinguisher Available', description: 'Appropriate extinguisher within reach', isRequired: true, category: 'safety' },
  { id: 'safety-3', title: 'Emergency Contact Displayed', description: 'Emergency numbers visible', isRequired: true, category: 'safety' },
  { id: 'safety-4', title: 'First Aid Kit Available', description: 'First aid kit accessible', isRequired: true, category: 'safety' },
  // Type-specific items
  ...(permitTypeCode === 'hot_work' ? [
    { id: 'type-1', title: 'Fire Watch Assigned', description: 'Dedicated fire watch person on site', isRequired: true, category: 'type_specific' as const },
    { id: 'type-2', title: 'Combustibles Removed', description: 'No flammable materials within 11m', isRequired: true, category: 'type_specific' as const },
    { id: 'type-3', title: 'Gas Test Completed', description: 'Atmosphere tested for flammables', isRequired: true, category: 'type_specific' as const },
  ] : []),
  ...(permitTypeCode === 'confined_space' ? [
    { id: 'type-1', title: 'Entry Permit Signed', description: 'All signatures obtained', isRequired: true, category: 'type_specific' as const },
    { id: 'type-2', title: 'Rescue Team on Standby', description: 'Rescue team notified and ready', isRequired: true, category: 'type_specific' as const },
    { id: 'type-3', title: 'Continuous Monitoring', description: 'Gas monitor active', isRequired: true, category: 'type_specific' as const },
  ] : []),
];

export default function PTWFieldInspection() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isRTL = i18n.dir() === 'rtl';
  
  const { data: permit, isLoading } = usePTWPermit(id);
  const realtimeStatus = usePTWRealtime({ permitId: id, enabled: !!id });
  
  const [responses, setResponses] = useState<ChecklistResponse[]>([]);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isCapturingGPS, setIsCapturingGPS] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const applicantSigRef = useRef<SignaturePadRef>(null);
  const supervisorSigRef = useRef<SignaturePadRef>(null);
  const issuerSigRef = useRef<SignaturePadRef>(null);

  const permitTypeCode = permit?.permit_type?.code || '';
  const checklistItems = permit ? getChecklistItems(permitTypeCode) : [];

  const handleResponseChange = useCallback((response: ChecklistResponse) => {
    setResponses((prev) => {
      const existing = prev.findIndex((r) => r.itemId === response.itemId);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = response;
        return next;
      }
      return [...prev, response];
    });
  }, []);

  const handlePhotoCapture = useCallback((itemId: string) => {
    // In production, this would open camera or file picker
    toast({
      title: t('ptw.mobile.photoCapture', 'Photo Capture'),
      description: t('ptw.mobile.photoCaptureDesc', 'Camera integration coming soon'),
    });
  }, [toast, t]);

  const captureGPS = useCallback(async () => {
    if (!navigator.geolocation) {
      toast({
        title: t('common.error', 'Error'),
        description: t('ptw.mobile.gpsNotSupported', 'GPS is not supported'),
        variant: 'destructive',
      });
      return;
    }

    setIsCapturingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsCapturingGPS(false);
        toast({
          title: t('ptw.mobile.gpsCaptured', 'Location captured'),
        });
      },
      (error) => {
        console.error('GPS error:', error);
        setIsCapturingGPS(false);
        toast({
          title: t('common.error', 'Error'),
          description: t('ptw.mobile.gpsError', 'Could not capture location'),
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [toast, t]);

  const handleSubmit = useCallback(async () => {
    // Validate all required items are completed
    const requiredItems = checklistItems.filter((item) => item.isRequired);
    const incompleteRequired = requiredItems.filter((item) => {
      const response = responses.find((r) => r.itemId === item.id);
      return !response || response.status === 'pending';
    });

    if (incompleteRequired.length > 0) {
      toast({
        title: t('ptw.mobile.incompleteItems', 'Incomplete Items'),
        description: t('ptw.mobile.completeRequired', 'Please complete all required checklist items'),
        variant: 'destructive',
      });
      return;
    }

    // Check signatures
    if (applicantSigRef.current?.isEmpty()) {
      toast({
        title: t('ptw.mobile.signatureRequired', 'Signature Required'),
        description: t('ptw.mobile.applicantSignRequired', 'Applicant signature is required'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // In production, this would save to the database
      const inspectionData = {
        permitId: id,
        responses,
        signatures: {
          applicant: applicantSigRef.current?.getSignatureDataUrl(),
          supervisor: supervisorSigRef.current?.getSignatureDataUrl(),
          issuer: issuerSigRef.current?.getSignatureDataUrl(),
        },
        gpsLocation,
        completedAt: new Date().toISOString(),
      };

      console.log('Submitting inspection:', inspectionData);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast({
        title: t('ptw.mobile.inspectionSubmitted', 'Inspection Submitted'),
        description: t('ptw.mobile.inspectionSuccess', 'Field inspection completed successfully'),
      });

      navigate(`/ptw/permits/${id}`);
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: t('common.error', 'Error'),
        description: t('ptw.mobile.submitError', 'Failed to submit inspection'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [checklistItems, responses, id, gpsLocation, toast, t, navigate]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!permit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold">{t('ptw.permit.notFound', 'Permit not found')}</h2>
        <Button variant="outline" onClick={() => navigate('/ptw/console')} className="mt-4">
          {t('common.goBack', 'Go Back')}
        </Button>
      </div>
    );
  }

  const completedCount = responses.filter((r) => r.status !== 'pending').length;
  const isComplete = completedCount === checklistItems.length && !applicantSigRef.current?.isEmpty();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <QRCodeSVG value={permit.reference_id || id || ''} size={40} />
              <div>
                <h1 className="text-lg font-bold text-foreground">{permit.reference_id}</h1>
                <Badge variant="outline">{permit.permit_type?.name || permitTypeCode}</Badge>
              </div>
            </div>
            <PTWRealtimeIndicator {...realtimeStatus} />
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{permit.job_description}</p>
        </div>
      </div>

      {/* GPS Capture */}
      <div className="p-4 border-b">
        <Button
          variant={gpsLocation ? 'secondary' : 'outline'}
          className="w-full h-12"
          onClick={captureGPS}
          disabled={isCapturingGPS}
        >
          {isCapturingGPS ? (
            <>
              <Loader2 className="me-2 h-5 w-5 animate-spin" />
              {t('ptw.mobile.gpsCapturing', 'Capturing location...')}
            </>
          ) : gpsLocation ? (
            <>
              <CheckCircle2 className="me-2 h-5 w-5 text-green-500" />
              {t('ptw.mobile.gpsCaptured', 'Location captured')}
            </>
          ) : (
            <>
              <MapPin className="me-2 h-5 w-5" />
              {t('ptw.mobile.captureGPS', 'Capture GPS Location')}
            </>
          )}
        </Button>
        {gpsLocation && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)}
          </p>
        )}
      </div>

      {/* Checklist */}
      <div className="p-4">
        <PTWMobileChecklist
          permitType={permitTypeCode}
          items={checklistItems}
          responses={responses}
          onResponseChange={handleResponseChange}
          onPhotoCapture={handlePhotoCapture}
        />
      </div>

      <Separator className="my-4" />

      {/* Signatures */}
      <div className="p-4 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">
          {t('ptw.inspection.signatures', 'Signatures')}
        </h2>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('ptw.inspection.applicantSign', 'Applicant Signature')} *</CardTitle>
          </CardHeader>
          <CardContent>
            <SignaturePad ref={applicantSigRef} height={120} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('ptw.inspection.supervisorSign', 'Supervisor Signature')}</CardTitle>
          </CardHeader>
          <CardContent>
            <SignaturePad ref={supervisorSigRef} height={120} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('ptw.inspection.issuerSign', 'Issuer Signature')}</CardTitle>
          </CardHeader>
          <CardContent>
            <SignaturePad ref={issuerSigRef} height={120} />
          </CardContent>
        </Card>
      </div>

      {/* Fixed Submit Button */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-background/95 backdrop-blur-sm border-t">
        <Button
          size="lg"
          className="w-full h-14 text-lg font-semibold"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="me-2 h-5 w-5 animate-spin" />
              {t('common.submitting', 'Submitting...')}
            </>
          ) : (
            <>
              {t('ptw.mobile.submitInspection', 'Submit Inspection')}
              <ArrowRight className={cn('h-5 w-5', isRTL ? 'me-2 rotate-180' : 'ms-2')} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
