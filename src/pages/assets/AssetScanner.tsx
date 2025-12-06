import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AssetQRScanner } from '@/components/assets/AssetQRScanner';
import { ModuleGate } from '@/components/ModuleGate';
import { useState } from 'react';

function AssetScannerContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState('');

  const handleManualSearch = () => {
    if (manualCode.trim()) {
      // Navigate to asset list with search filter
      navigate(`/assets?search=${encodeURIComponent(manualCode.trim())}`);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode className="h-6 w-6" />
          {t('assets.assetScanner')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('assets.assetScannerDescription')}
        </p>
      </div>

      <div className="space-y-6">
        <AssetQRScanner autoNavigate />
        
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
