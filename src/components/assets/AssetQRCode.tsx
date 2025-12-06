import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AssetQRCodeProps {
  assetId: string;
  assetCode: string;
  assetName: string;
  size?: number;
}

export function AssetQRCode({ assetId, assetCode, assetName, size = 200 }: AssetQRCodeProps) {
  const { t } = useTranslation();
  const qrRef = useRef<HTMLDivElement>(null);
  
  // Generate QR data - URL to asset detail page
  const qrValue = `${window.location.origin}/assets/${assetId}`;
  
  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      ctx?.drawImage(img, 0, 0);
      
      const link = document.createElement('a');
      link.download = `${assetCode}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };
  
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${assetCode} - QR Code</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 20px;
              border: 2px dashed #ccc;
            }
            .asset-code {
              font-size: 24px;
              font-weight: bold;
              margin-top: 16px;
            }
            .asset-name {
              font-size: 14px;
              color: #666;
              margin-top: 8px;
              max-width: 200px;
            }
            @media print {
              .qr-container {
                border: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${svgData}
            <div class="asset-code">${assetCode}</div>
            <div class="asset-name">${assetName}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('assets.qrCode')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div ref={qrRef} className="p-4 bg-white rounded-lg">
          <QRCodeSVG
            value={qrValue}
            size={size}
            level="H"
            includeMargin
          />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          {t('assets.scanToView')}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 me-2" />
            {t('common.download')}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 me-2" />
            {t('common.print')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
