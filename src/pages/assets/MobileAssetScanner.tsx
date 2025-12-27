import { useTranslation } from 'react-i18next';
import { Smartphone } from 'lucide-react';
import { MobileAssetScannerUI } from '@/components/assets/MobileAssetScannerUI';
import { ModuleGate } from '@/components/ModuleGate';

function MobileAssetScannerContent() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Smartphone className="h-6 w-6" />
            {t('assets.mobileScanner', 'Mobile Asset Scanner')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('assets.mobileScannerDescription', 'Scan assets, record inspections, and sync offline actions')}
          </p>
        </div>
        
        <MobileAssetScannerUI defaultAction="view" />
      </div>
    </div>
  );
}

export default function MobileAssetScanner() {
  return (
    <ModuleGate module="asset_management" showUpgradePrompt>
      <MobileAssetScannerContent />
    </ModuleGate>
  );
}
