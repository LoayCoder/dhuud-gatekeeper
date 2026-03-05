import { useTranslation } from 'react-i18next';
import { QrCode } from 'lucide-react';
import { ScannerDialog } from '@/components/ui/scanner-dialog';

interface ContractorQRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
}

export function ContractorQRScanner({ open, onOpenChange, onScan }: ContractorQRScannerProps) {
  const { t } = useTranslation();

  const handleScan = (decodedText: string) => {
    // Extract contractor code from QR data
    let code = decodedText;
    if (decodedText.startsWith('CONTRACTOR:')) {
      code = decodedText.replace('CONTRACTOR:', '');
    }
    onScan(code);
  };

  return (
    <ScannerDialog
      open={open}
      onOpenChange={onOpenChange}
      onScan={handleScan}
      title={t('security.contractorCheck.scannerTitle', 'Scan Contractor QR')}
      description={t('security.contractorCheck.scannerDescription', 'Point camera at contractor QR code')}
      icon={<QrCode className="h-5 w-5 text-primary" />}
      containerId="contractor-qr-scanner"
      qrboxSize={{ width: 250, height: 250 }}
    />
  );
}
