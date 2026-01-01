import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, Search, CheckCircle2, LogOut, AlertTriangle, User, Building, Calendar, ShieldAlert, MapPin } from 'lucide-react';
import { useVisitorByQRToken } from '@/hooks/use-visitors';
import { useVisitRequests, useCheckInVisitor, useCheckOutVisitor } from '@/hooks/use-visit-requests';
import { useCheckBlacklist } from '@/hooks/use-security-blacklist';
import { format } from 'date-fns';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { toast } from 'sonner';

export default function VisitorCheckpoint() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const prefilledRequestId = searchParams.get('requestId');
  
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [manualSearch, setManualSearch] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(prefilledRequestId);
  
  const { data: visitorFromQR, isLoading: qrLoading } = useVisitorByQRToken(scanResult ?? undefined);
  const { data: allRequests } = useVisitRequests();
  const checkInMutation = useCheckInVisitor();
  const checkOutMutation = useCheckOutVisitor();

  // Find the matching request for the scanned visitor
  const matchingRequest = allRequests?.find(r => 
    r.visitor_id === visitorFromQR?.id && 
    (r.status === 'approved' || r.status === 'checked_in')
  );

  const selectedRequest = allRequests?.find(r => r.id === selectedRequestId);
  const { data: blacklistCheck } = useCheckBlacklist(selectedRequest?.visitor?.national_id ?? visitorFromQR?.national_id ?? undefined);

  // Initialize QR scanner
  useEffect(() => {
    const scanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    }, false);

    scanner.render(
      (decodedText) => {
        // Reject worker QR codes - they should use Gate Scanner
        if (decodedText.startsWith('WORKER:')) {
          toast.error(t('visitors.checkpoint.wrongQRType', 'This is a Worker QR code. Please use the Gate Scanner for workers.'));
          return;
        }
        
        // Strip VISITOR: prefix if present, or use raw token for backward compatibility
        const token = decodedText.startsWith('VISITOR:') 
          ? decodedText.replace('VISITOR:', '') 
          : decodedText;
        
        setScanResult(token);
        scanner.clear();
      },
      (error) => {
        // Ignore scan errors
      }
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  // Auto-select matching request when QR is scanned
  useEffect(() => {
    if (matchingRequest) {
      setSelectedRequestId(matchingRequest.id);
    }
  }, [matchingRequest]);

  const handleCheckIn = async () => {
    if (!selectedRequestId) return;
    await checkInMutation.mutateAsync(selectedRequestId);
    setSelectedRequestId(null);
    setScanResult(null);
  };

  const handleCheckOut = async () => {
    if (!selectedRequestId) return;
    await checkOutMutation.mutateAsync(selectedRequestId);
    setSelectedRequestId(null);
    setScanResult(null);
  };

  const handleManualSearch = () => {
    const found = allRequests?.find(r => 
      r.visitor?.full_name?.toLowerCase().includes(manualSearch.toLowerCase()) ||
      r.visitor?.national_id?.includes(manualSearch)
    );
    if (found) {
      setSelectedRequestId(found.id);
    }
  };

  const isBlacklisted = !!blacklistCheck;
  const currentRequest = selectedRequest || (matchingRequest ? matchingRequest : null);
  const canCheckIn = currentRequest?.status === 'approved' && !isBlacklisted;
  const canCheckOut = currentRequest?.status === 'checked_in';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('visitors.checkpoint.title')}</h1>
        <p className="text-muted-foreground">{t('visitors.checkpoint.description')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scanner/Search Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('visitors.checkpoint.scan')}</CardTitle>
            <CardDescription>{t('visitors.checkpoint.scanDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="scan">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="scan">
                  <QrCode className="me-2 h-4 w-4" />
                  {t('visitors.checkpoint.qrScan')}
                </TabsTrigger>
                <TabsTrigger value="manual">
                  <Search className="me-2 h-4 w-4" />
                  {t('visitors.checkpoint.manualSearch')}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="scan" className="mt-4 space-y-3">
                {/* Visual indicator showing expected QR type */}
                <div className="flex items-center justify-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <User className="h-5 w-5 text-primary" />
                  <div className="text-center">
                    <p className="font-medium text-primary">{t('visitors.checkpoint.expectedVisitorQR', 'Scan Visitor QR Code')}</p>
                    <p className="text-xs text-muted-foreground">{t('visitors.checkpoint.visitorQRHint', 'Only visitor QR codes are accepted here')}</p>
                  </div>
                </div>
                <div id="qr-reader" className="w-full" />
                {scanResult && !matchingRequest && !qrLoading && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{t('visitors.checkpoint.noValidVisit')}</AlertTitle>
                    <AlertDescription>{t('visitors.checkpoint.noValidVisitDescription')}</AlertDescription>
                  </Alert>
                )}
              </TabsContent>
              <TabsContent value="manual" className="mt-4 space-y-4">
                <div>
                  <Label>{t('visitors.checkpoint.searchLabel')}</Label>
                  <div className="flex gap-2 mt-2">
                    <Input 
                      value={manualSearch}
                      onChange={(e) => setManualSearch(e.target.value)}
                      placeholder={t('visitors.checkpoint.searchPlaceholder')}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                    />
                    <Button onClick={handleManualSearch}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Visitor Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t('visitors.checkpoint.visitorDetails')}</CardTitle>
          </CardHeader>
          <CardContent>
            {!currentRequest ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>{t('visitors.checkpoint.scanToStart')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Blacklist Warning */}
                {isBlacklisted && (
                  <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>{t('visitors.blacklist.warning')}</AlertTitle>
                    <AlertDescription>
                      {t('visitors.blacklist.reason')}: {blacklistCheck?.reason}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Visitor Info */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-lg">{currentRequest.visitor?.full_name}</h4>
                    <Badge variant={currentRequest.status === 'checked_in' ? 'default' : 'secondary'}>
                      {t(`visitors.status.${currentRequest.status}`)}
                    </Badge>
                  </div>
                  {currentRequest.visitor?.company_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{currentRequest.visitor.company_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{t('visitors.site')}: {currentRequest.site?.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(currentRequest.valid_from), 'PPp')} - {format(new Date(currentRequest.valid_until), 'PPp')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {canCheckIn && (
                    <Button 
                      className="flex-1" 
                      onClick={handleCheckIn}
                      disabled={checkInMutation.isPending}
                    >
                      <CheckCircle2 className="me-2 h-4 w-4" />
                      {checkInMutation.isPending ? t('common.loading') : t('visitors.actions.checkIn')}
                    </Button>
                  )}
                  {canCheckOut && (
                    <Button 
                      variant="outline" 
                      className="flex-1" 
                      onClick={handleCheckOut}
                      disabled={checkOutMutation.isPending}
                    >
                      <LogOut className="me-2 h-4 w-4" />
                      {checkOutMutation.isPending ? t('common.loading') : t('visitors.actions.checkOut')}
                    </Button>
                  )}
                  {!canCheckIn && !canCheckOut && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {isBlacklisted 
                          ? t('visitors.checkpoint.blockedByBlacklist')
                          : t('visitors.checkpoint.notApproved')}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <Button 
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => {
                    setSelectedRequestId(null);
                    setScanResult(null);
                  }}
                >
                  {t('visitors.checkpoint.scanAnother')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
