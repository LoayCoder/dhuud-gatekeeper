import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Scan } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScannerDialog } from '@/components/ui/scanner-dialog';

interface VisitorIdScannerProps {
  onScan: (value: string) => void;
}

export function VisitorIdScanner({ onScan }: VisitorIdScannerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleScan = (decodedText: string) => {
    onScan(decodedText);
    toast({
      title: t('visitors.scan.scanSuccess', 'ID scanned successfully'),
    });
    setOpen(false);
  };

  return (
    <>
      <Button 
        type="button" 
        variant="outline" 
        size="icon"
        onClick={() => setOpen(true)}
      >
        <Scan className="h-4 w-4" />
      </Button>

      <ScannerDialog
        open={open}
        onOpenChange={setOpen}
        onScan={handleScan}
        title={t('visitors.scan.scanId', 'Scan ID')}
        description={t('visitors.scan.scanning', 'Scanning...')}
        icon={<Scan className="h-5 w-5 text-primary" />}
        containerId="visitor-id-scanner"
        qrboxSize={{ width: 250, height: 100 }}
        aspectRatio={2.5}
      />
    </>
  );
}
