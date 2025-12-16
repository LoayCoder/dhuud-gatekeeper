import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, QrCode, Barcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssetQRScanner } from '@/components/assets/AssetQRScanner';
import { AssetBarcodeScanner } from '@/components/assets/AssetBarcodeScanner';
import { AssetScanResult } from '@/components/assets/AssetScanResult';
import { ModuleGate } from '@/components/ModuleGate';
import { useState } from 'react';

function AssetScannerContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState('');
  const [scannedAssetId, setScannedAssetId] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'barcode' | 'qrcode'>('barcode');

  const handleManualSearch = () => {
    if (manualCode.trim()) {
      navigate(`/assets?search=${encodeURIComponent(manualCode.trim())}`);
    }
  };

  const handleScanSuccess = (assetId: string) => {
    setScannedAssetId(assetId);
  };

  const handleClearScan = () => {
    setScannedAssetId(null);
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
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder={t('assets.enterAssetCode')}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
              />
              <Button onClick={handleManualSearch} disabled={!manualCode.trim()}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
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
