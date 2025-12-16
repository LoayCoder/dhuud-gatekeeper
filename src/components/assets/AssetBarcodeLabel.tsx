import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import JsBarcode from 'jsbarcode';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Label specifications: 30mm × 20mm at 300 DPI
const LABEL_SPECS = {
  LABEL_WIDTH_MM: 30,
  LABEL_HEIGHT_MM: 20,
  BARCODE_WIDTH_MM: 20,
  BARCODE_HEIGHT_MM: 10,
  DPI: 300,
  MM_TO_PX: 11.811, // 300 DPI / 25.4mm
};

interface AssetBarcodeLabelProps {
  assetCode: string;
  assetId: string;
  siteName?: string;
  zoneName?: string;
}

export function AssetBarcodeLabel({
  assetCode,
  assetId,
  siteName,
  zoneName,
}: AssetBarcodeLabelProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [showZone, setShowZone] = useState(true);

  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, assetCode, {
        format: 'CODE128',
        width: 2,
        height: 40,
        displayValue: true,
        fontSize: 12,
        margin: 2,
        background: '#FFFFFF',
        lineColor: '#000000',
      });
    }
  }, [assetCode]);

  const handleDownload = async () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 30mm × 20mm at 300 DPI
      const width = Math.round(LABEL_SPECS.LABEL_WIDTH_MM * LABEL_SPECS.MM_TO_PX);
      const height = Math.round(LABEL_SPECS.LABEL_HEIGHT_MM * LABEL_SPECS.MM_TO_PX);
      
      canvas.width = width;
      canvas.height = height;

      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Generate barcode on temporary canvas
      const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      JsBarcode(tempSvg, assetCode, {
        format: 'CODE128',
        width: 3,
        height: 80,
        displayValue: true,
        fontSize: 24,
        margin: 10,
        background: '#FFFFFF',
        lineColor: '#000000',
      });

      // Convert SVG to image
      const svgData = new XMLSerializer().serializeToString(tempSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        // Draw barcode centered horizontally, top area
        const barcodeX = (width - img.width * 0.7) / 2;
        const barcodeY = 10;
        ctx.drawImage(img, barcodeX, barcodeY, img.width * 0.7, img.height * 0.7);

        // Draw zone info if enabled
        if (showZone && (siteName || zoneName)) {
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 18px Arial';
          ctx.textAlign = 'center';
          const zoneText = [siteName, zoneName].filter(Boolean).join(' / ');
          ctx.fillText(zoneText, width / 2, height - 20);
        }

        URL.revokeObjectURL(svgUrl);

        // Download
        const link = document.createElement('a');
        link.download = `barcode-${assetCode}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();

        toast.success(t('assets.barcodeDownloaded'));
      };
      img.src = svgUrl;
    } catch (error) {
      console.error('Error generating barcode:', error);
      toast.error(t('assets.barcodeDownloadError'));
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(t('common.popupBlocked'));
      return;
    }

    const zoneText = showZone && (siteName || zoneName) 
      ? [siteName, zoneName].filter(Boolean).join(' / ')
      : '';

    // Generate barcode SVG for print
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(tempSvg, assetCode, {
      format: 'CODE128',
      width: 2,
      height: 50,
      displayValue: true,
      fontSize: 14,
      margin: 5,
      background: '#FFFFFF',
      lineColor: '#000000',
    });
    const svgString = new XMLSerializer().serializeToString(tempSvg);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <title>${t('assets.printBarcode')}</title>
        <style>
          @page {
            size: 30mm 20mm;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            width: 30mm;
            height: 20mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
            background: white;
          }
          .barcode-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1mm;
          }
          .barcode-container svg {
            max-width: 28mm;
            height: auto;
          }
          .zone-text {
            font-size: 6pt;
            font-weight: bold;
            text-align: center;
            max-width: 28mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        </style>
      </head>
      <body>
        <div class="barcode-container">
          ${svgString}
          ${zoneText ? `<div class="zone-text">${zoneText}</div>` : ''}
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="space-y-4">
      {/* Barcode Preview */}
      <div className="flex justify-center p-4 bg-white rounded-lg border">
        <div className="flex flex-col items-center gap-2">
          <svg ref={barcodeRef} />
          {showZone && (siteName || zoneName) && (
            <p className="text-xs font-medium text-black">
              {[siteName, zoneName].filter(Boolean).join(' / ')}
            </p>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="flex items-center justify-between">
        <Label htmlFor="show-zone" className="text-sm">
          {t('assets.includeZoneCode')}
        </Label>
        <Switch
          id="show-zone"
          checked={showZone}
          onCheckedChange={setShowZone}
        />
      </div>

      {/* Info */}
      <p className="text-xs text-muted-foreground text-center">
        {t('assets.code128Format')} • 30×20mm • 300 DPI
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4 me-2" />
          {t('assets.downloadBarcode')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handlePrint}
        >
          <Printer className="h-4 w-4 me-2" />
          {t('assets.printBarcode')}
        </Button>
      </div>
    </div>
  );
}
