import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Camera, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Car,
  X
} from 'lucide-react';
import { useANPRRecognition, ANPRResult } from '@/hooks/use-anpr-recognition';
import { cn } from '@/lib/utils';

interface ANPRCaptureWidgetProps {
  onPlateRecognized: (plate: string, imageBase64?: string, result?: ANPRResult) => void;
  className?: string;
  showManualInput?: boolean;
}

export function ANPRCaptureWidget({ 
  onPlateRecognized, 
  className,
  showManualInput = true 
}: ANPRCaptureWidgetProps) {
  const { t } = useTranslation();
  const { recognizePlate, isProcessing, result, reset } = useANPRRecognition();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [manualPlate, setManualPlate] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setShowCamera(true);
    } catch (err) {
      console.error('[ANPR] Camera error:', err);
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }, []);

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
    
    setCapturedImage(imageBase64);
    stopCamera();

    // Process with ANPR
    const anprResult = await recognizePlate(imageBase64);
    if (anprResult?.plate) {
      onPlateRecognized(anprResult.plate, imageBase64, anprResult);
    }
  };

  const handleManualSubmit = () => {
    if (manualPlate.trim()) {
      onPlateRecognized(manualPlate.trim().toUpperCase());
      setManualPlate('');
    }
  };

  const handleRetry = () => {
    setCapturedImage(null);
    reset();
    startCamera();
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) {
      return <Badge className="bg-green-500 gap-1"><CheckCircle className="h-3 w-3" />{confidence}%</Badge>;
    } else if (confidence >= 50) {
      return <Badge className="bg-yellow-500 gap-1"><AlertTriangle className="h-3 w-3" />{confidence}%</Badge>;
    }
    return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{confidence}%</Badge>;
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Camera View */}
          {showCamera && (
            <div className="relative">
              <video 
                ref={videoRef} 
                className="w-full rounded-lg bg-black"
                autoPlay 
                playsInline 
                muted
              />
              <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2">
                <Button onClick={captureImage} size="lg" className="gap-2">
                  <Camera className="h-5 w-5" />
                  {t('security.anpr.capture', 'Capture')}
                </Button>
                <Button variant="outline" onClick={stopCamera} size="lg">
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">
                {t('security.anpr.processing', 'Recognizing plate...')}
              </p>
            </div>
          )}

          {/* Result Display */}
          {result && !isProcessing && (
            <div className="space-y-3">
              {capturedImage && (
                <img 
                  src={capturedImage} 
                  alt="Captured" 
                  className="w-full rounded-lg max-h-48 object-cover"
                />
              )}
              
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-muted-foreground" />
                  <div>
                    {result.plate ? (
                      <p className="font-mono text-lg font-bold">{result.plate}</p>
                    ) : (
                      <p className="text-muted-foreground">{t('security.anpr.noPlateDetected', 'No plate detected')}</p>
                    )}
                    {result.vehicle_color && result.vehicle_type && (
                      <p className="text-xs text-muted-foreground">
                        {result.vehicle_color} {result.vehicle_type}
                      </p>
                    )}
                  </div>
                </div>
                {result.plate && getConfidenceBadge(result.confidence)}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetry} className="flex-1">
                  <RefreshCw className="h-4 w-4 me-2" />
                  {t('security.anpr.retry', 'Retry')}
                </Button>
                {result.plate && (
                  <Button 
                    onClick={() => onPlateRecognized(result.plate!, capturedImage || undefined, result)} 
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 me-2" />
                    {t('security.anpr.use', 'Use This Plate')}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Initial State - Camera Button */}
          {!showCamera && !isProcessing && !result && (
            <div className="space-y-4">
              <Button 
                onClick={startCamera} 
                variant="outline" 
                className="w-full h-24 flex-col gap-2"
              >
                <Camera className="h-8 w-8" />
                <span>{t('security.anpr.scanPlate', 'Scan License Plate')}</span>
              </Button>
            </div>
          )}

          {/* Manual Input */}
          {showManualInput && !showCamera && !isProcessing && (
            <div className="pt-4 border-t">
              <Label className="text-xs text-muted-foreground">
                {t('security.anpr.orEnterManually', 'Or enter plate manually')}
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={manualPlate}
                  onChange={(e) => setManualPlate(e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  className="font-mono"
                />
                <Button 
                  onClick={handleManualSubmit} 
                  disabled={!manualPlate.trim()}
                >
                  {t('common.add', 'Add')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
