import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ArrowRight, RotateCcw, Printer, Eye, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type CreationStatus = 'idle' | 'creating' | 'success' | 'error';

interface AssetCreationStatusCardProps {
  status: CreationStatus;
  assetCodes: string[];
  assetIds: string[];
  errorMessage?: string | null;
  onRetry: () => void;
  onCreateAnother: () => void;
  redirectSeconds?: number;
}

export function AssetCreationStatusCard({
  status,
  assetCodes,
  assetIds,
  errorMessage,
  onRetry,
  onCreateAnother,
  redirectSeconds = 5,
}: AssetCreationStatusCardProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();
  const [countdown, setCountdown] = useState(redirectSeconds);
  const [progress, setProgress] = useState(0);

  const isBulk = assetCodes.length > 1;
  const displayCode = isBulk 
    ? `${assetCodes[0]} - ${assetCodes[assetCodes.length - 1]}`
    : assetCodes[0] || '';

  // Countdown and auto-redirect on success
  useEffect(() => {
    if (status !== 'success') {
      setCountdown(redirectSeconds);
      setProgress(0);
      return;
    }

    const startTime = Date.now();
    const duration = redirectSeconds * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const newProgress = ((duration - remaining) / duration) * 100;
      
      setProgress(newProgress);
      setCountdown(Math.ceil(remaining / 1000));

      if (remaining <= 0) {
        clearInterval(interval);
        // Auto-redirect to asset detail or list
        if (assetIds.length === 1) {
          navigate(`/assets/${assetIds[0]}`);
        } else {
          navigate('/assets');
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [status, redirectSeconds, assetIds, navigate]);

  if (status === 'idle') return null;

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardContent className="pt-8 pb-6" dir={direction}>
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Status Icon */}
          {status === 'creating' && (
            <div className="relative w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
          )}
          
          {status === 'success' && (
            <div className="relative">
              <div className="absolute inset-0 bg-success/20 rounded-full animate-ping" />
              <div className="relative w-20 h-20 bg-success/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-success animate-in zoom-in duration-300" />
              </div>
            </div>
          )}
          
          {status === 'error' && (
            <div className="relative w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
              <XCircle className="h-12 w-12 text-destructive animate-in zoom-in duration-300" />
            </div>
          )}

          {/* Title & Description */}
          <div className="space-y-2">
            {status === 'creating' && (
              <>
                <h2 className="text-xl font-semibold text-foreground">
                  {isBulk 
                    ? t('assets.creatingBulkAssets', 'Creating {{count}} assets...', { count: assetCodes.length })
                    : t('assets.creatingAsset', 'Creating asset...')
                  }
                </h2>
                <p className="text-muted-foreground">
                  {t('assets.pleaseWait', 'Please wait while we register your asset.')}
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <h2 className="text-xl font-semibold text-foreground">
                  {isBulk
                    ? t('assets.bulkCreateSuccess', '{{count}} Assets Created Successfully!', { count: assetCodes.length })
                    : t('assets.createSuccess', 'Asset Created Successfully!')
                  }
                </h2>
                <p className="text-muted-foreground">
                  {t('assets.assetRegistered', 'The asset has been registered and is ready for use.')}
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <h2 className="text-xl font-semibold text-foreground">
                  {t('assets.createFailed', 'Asset Creation Failed')}
                </h2>
                <p className="text-muted-foreground">
                  {t('assets.createFailedDescription', 'We could not create the asset. Please try again.')}
                </p>
              </>
            )}
          </div>

          {/* Asset Code Display (Success) */}
          {status === 'success' && displayCode && (
            <div className="w-full bg-muted/50 rounded-lg p-4 border-2 border-dashed border-success/30">
              <p className="text-sm text-muted-foreground mb-1">
                {isBulk 
                  ? t('assets.assetCodesRange', 'Asset Codes')
                  : t('assets.assetCodeLabel', 'Asset Code')
                }
              </p>
              <p className="text-xl font-mono font-bold text-success">
                {displayCode}
              </p>
            </div>
          )}

          {/* Error Message Display */}
          {status === 'error' && errorMessage && (
            <div className="w-full bg-destructive/10 rounded-lg p-4 border border-destructive/30">
              <p className="text-sm text-destructive font-medium">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Countdown Progress (Success) */}
          {status === 'success' && (
            <div className="w-full space-y-2">
              <p className="text-sm text-muted-foreground">
                {assetIds.length === 1
                  ? t('assets.redirectingToDetails', 'Redirecting to asset details in {{seconds}} seconds...', { seconds: countdown })
                  : t('assets.redirectingToList', 'Redirecting to asset list in {{seconds}} seconds...', { seconds: countdown })
                }
              </p>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="w-full flex flex-col sm:flex-row gap-3">
            {status === 'success' && (
              <>
                {assetIds.length === 1 && (
                  <Button 
                    onClick={() => navigate(`/assets/${assetIds[0]}`)} 
                    className="flex-1 gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    {t('assets.viewAsset', 'View Asset')}
                    <ArrowRight className={cn("h-4 w-4", direction === 'rtl' && "rotate-180")} />
                  </Button>
                )}
                
                {assetIds.length > 0 && (
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/assets/bulk-print', { state: { assetIds } })}
                    className="flex-1 gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    {t('assets.printLabels', 'Print Labels')}
                  </Button>
                )}

                <Button 
                  variant="secondary"
                  onClick={onCreateAnother}
                  className="flex-1 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {t('assets.createAnother', 'Create Another')}
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <Button 
                  onClick={onRetry}
                  className="flex-1 gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('common.tryAgain', 'Try Again')}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => navigate('/assets')}
                  className="flex-1"
                >
                  {t('assets.backToList', 'Back to List')}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
