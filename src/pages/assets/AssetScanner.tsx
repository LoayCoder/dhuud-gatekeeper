import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, QrCode, Barcode, Loader2, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetQRScanner } from '@/components/assets/AssetQRScanner';
import { AssetBarcodeScanner } from '@/components/assets/AssetBarcodeScanner';
import { AssetScanResult } from '@/components/assets/AssetScanResult';
import { ModuleGate } from '@/components/ModuleGate';
import { useState, useEffect } from 'react';
import { useAssetByCode } from '@/hooks/use-asset-by-code';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Auto-format asset code input to AST-YYYY-NNNNN pattern
 */
function formatAssetCode(input: string): string {
  // Remove all non-alphanumeric characters and uppercase
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Remove AST prefix if present
  const withoutPrefix = clean.replace(/^AST/, '');
  
  // If we have digits, format them
  if (withoutPrefix.length > 0) {
    const digits = withoutPrefix.replace(/[^0-9]/g, '');
    if (digits.length <= 4) {
      // Just year part
      return `AST-${digits}`;
    } else {
      // Year + number
      const year = digits.slice(0, 4);
      const number = digits.slice(4, 9); // Max 5 digits for number
      return `AST-${year}-${number}`;
    }
  }
  
  return input;
}

function AssetScannerContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState('');
  const [searchCode, setSearchCode] = useState<string | null>(null);
  const [manualNotFound, setManualNotFound] = useState(false);
  const [scannedAssetId, setScannedAssetId] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'barcode' | 'qrcode'>('barcode');
  
  // Collision detection state
  const [showCollisionDialog, setShowCollisionDialog] = useState(false);
  const [collisionAsset, setCollisionAsset] = useState<{ id: string; name: string; code: string } | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  // Hook for manual code lookup
  const { data: assetResult, isLoading: isLookingUp } = useAssetByCode(searchCode);

  // Handle asset lookup result
  useEffect(() => {
    if (searchCode && assetResult) {
      if (assetResult.found && assetResult.asset) {
        setScannedAssetId(assetResult.asset.id);
        setManualNotFound(false);
        setSearchCode(null);
      } else {
        setManualNotFound(true);
        setSearchCode(null);
      }
    }
  }, [assetResult, searchCode]);

  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAssetCode(e.target.value);
    setManualCode(formatted);
    setManualNotFound(false);
  };

  const handleManualSearch = () => {
    if (manualCode.trim().length >= 5) {
      setSearchCode(manualCode.trim());
    }
  };

  const handleScanSuccess = (assetId: string) => {
    setScannedAssetId(assetId);
  };

  const handleClearScan = () => {
    setScannedAssetId(null);
  };

  // Handle collision - navigate to existing asset
  const handleNavigateToExisting = () => {
    if (collisionAsset) {
      navigate(`/assets/${collisionAsset.id}`);
    }
    setShowCollisionDialog(false);
    setCollisionAsset(null);
    setPendingCode(null);
  };

  // Handle collision - register as new asset
  const handleRegisterNew = () => {
    if (pendingCode) {
      navigate(`/assets/register?code=${encodeURIComponent(pendingCode)}`);
    }
    setShowCollisionDialog(false);
    setCollisionAsset(null);
    setPendingCode(null);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {scanMode === 'barcode' ? (
            <Barcode className="h-6 w-6" />
          ) : (
            <QrCode className="h-6 w-6" />
          )}
          {t('assets.assetScanner')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('assets.assetScannerDescription')}
        </p>
      </div>

      <div className="space-y-6">
        {/* Scan Mode Toggle */}
        <Tabs value={scanMode} onValueChange={(v) => setScanMode(v as 'barcode' | 'qrcode')}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="barcode" className="flex items-center gap-2">
              <Barcode className="h-4 w-4" />
              {t('assets.barcodeScan')}
            </TabsTrigger>
            <TabsTrigger value="qrcode" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              {t('assets.qrCodeScan')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {scannedAssetId ? (
          <AssetScanResult 
            assetId={scannedAssetId} 
            onClear={handleClearScan}
            mode="navigate"
          />
        ) : (
          <>
            {scanMode === 'barcode' ? (
              <AssetBarcodeScanner 
                onScanSuccess={handleScanSuccess} 
                autoNavigate={false} 
              />
            ) : (
              <AssetQRScanner 
                onScanSuccess={handleScanSuccess} 
                autoNavigate={false} 
              />
            )}
          </>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('assets.manualEntry')}</CardTitle>
            <CardDescription>{t('assets.manualEntryDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="AST-2025-00001"
                value={manualCode}
                onChange={handleManualInputChange}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                disabled={isLookingUp}
                className="font-mono"
              />
              <Button 
                onClick={handleManualSearch} 
                disabled={manualCode.trim().length < 5 || isLookingUp}
              >
                {isLookingUp ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                )}
              </Button>
            </div>
            {manualNotFound && (
              <Alert className="border-warning bg-warning/10">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span>{t('assets.assetNotFoundManual', 'Asset not found in system.')}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => navigate(`/assets/register?code=${encodeURIComponent(manualCode)}`)}
                  >
                    <Plus className="h-4 w-4" />
                    {t('assets.registerNew', 'Register New')}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Collision Detection Dialog */}
      <Dialog open={showCollisionDialog} onOpenChange={setShowCollisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              {t('assets.assetFound', 'Asset Found')}
            </DialogTitle>
            <DialogDescription>
              {t('assets.collisionDetected', 
                'An asset with code "{{code}}" already exists in the system.',
                { code: collisionAsset?.code }
              )}
            </DialogDescription>
          </DialogHeader>
          
          {collisionAsset && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="font-medium">{collisionAsset.name}</p>
                <p className="text-sm text-muted-foreground font-mono">{collisionAsset.code}</p>
              </CardContent>
            </Card>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCollisionDialog(false);
                setCollisionAsset(null);
                setPendingCode(null);
              }}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="secondary" onClick={handleRegisterNew}>
              <Plus className="h-4 w-4 me-2" />
              {t('assets.registerAnyway', 'Register Anyway')}
            </Button>
            <Button onClick={handleNavigateToExisting}>
              {t('assets.viewExisting', 'View Existing Asset')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AssetScanner() {
  return (
    <ModuleGate module="asset_management" showUpgradePrompt>
      <AssetScannerContent />
    </ModuleGate>
  );
}
