import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import JsBarcode from 'jsbarcode';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LabelSettings, getLabelSizeSpec, DEFAULT_LABEL_SETTINGS } from './label-settings-types';

interface AssetBarcodeLabelProps {
  assetCode: string;
  assetId: string;
  assetName?: string;
  siteName?: string;
  zoneName?: string;
  categoryName?: string;
  serialNumber?: string;
  departmentName?: string;
  settings?: LabelSettings;
}

const MM_TO_PX = 11.811; // 300 DPI / 25.4mm

export function AssetBarcodeLabel({
  assetCode,
  assetId,
  assetName,
  siteName,
  zoneName,
  categoryName,
  serialNumber,
  departmentName,
  settings = DEFAULT_LABEL_SETTINGS,
}: AssetBarcodeLabelProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const barcodeRef = useRef<SVGSVGElement>(null);
  const sizeSpec = getLabelSizeSpec(settings.size, settings.customWidthMM, settings.customHeightMM);

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

  const getContentLines = (): string[] => {
    const lines: string[] = [];
    const { content } = settings;
    
    if (content.showAssetName && assetName) lines.push(assetName);
    if (content.showZone && (siteName || zoneName)) {
      lines.push([siteName, zoneName].filter(Boolean).join(' / '));
    }
    if (content.showCategory && categoryName) lines.push(categoryName);
    if (content.showSerialNumber && serialNumber) lines.push(`S/N: ${serialNumber}`);
    if (content.showDepartment && departmentName) lines.push(departmentName);
    if (content.customText) lines.push(content.customText);
    
    return lines;
  };

  const handleDownload = async () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = Math.round(sizeSpec.widthMM * MM_TO_PX);
      const height = Math.round(sizeSpec.heightMM * MM_TO_PX);
      
      canvas.width = width;
      canvas.height = height;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const barcodeHeight = Math.min(80, height * 0.4);
      JsBarcode(tempSvg, assetCode, {
        format: 'CODE128',
        width: 3,
        height: barcodeHeight,
        displayValue: true,
        fontSize: 24,
        margin: 10,
        background: '#FFFFFF',
        lineColor: '#000000',
      });

      const svgData = new XMLSerializer().serializeToString(tempSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const scale = Math.min(0.8, (width * 0.9) / img.width);
        const barcodeX = (width - img.width * scale) / 2;
        const barcodeY = 10;
        ctx.drawImage(img, barcodeX, barcodeY, img.width * scale, img.height * scale);

        const contentLines = getContentLines();
        if (contentLines.length > 0) {
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          const fontSize = Math.max(14, Math.min(18, height * 0.08));
          ctx.font = `bold ${fontSize}px Arial`;
          
          const startY = barcodeY + img.height * scale + 20;
          const lineHeight = fontSize * 1.3;
          
          contentLines.forEach((line, i) => {
            const y = startY + (i * lineHeight);
            if (y < height - 10) {
              ctx.fillText(line, width / 2, y, width - 20);
            }
          });
        }

        URL.revokeObjectURL(svgUrl);

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

    const contentLines = getContentLines();

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
            size: ${sizeSpec.widthMM}mm ${sizeSpec.heightMM}mm;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            width: ${sizeSpec.widthMM}mm;
            height: ${sizeSpec.heightMM}mm;
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
            max-width: ${sizeSpec.widthMM - 4}mm;
            height: auto;
          }
          .content-line {
            font-size: ${sizeSpec.heightMM > 30 ? '7pt' : '6pt'};
            font-weight: bold;
            text-align: center;
            max-width: ${sizeSpec.widthMM - 4}mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        </style>
      </head>
      <body>
        <div class="barcode-container">
          ${svgString}
          ${contentLines.map(line => `<div class="content-line">${line}</div>`).join('')}
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

  const contentLines = getContentLines();

  return (
    <div className="space-y-4">
      {/* Barcode Preview */}
      <div className="flex justify-center p-4 bg-white rounded-lg border">
        <div className="flex flex-col items-center gap-2">
          <svg ref={barcodeRef} />
          {contentLines.map((line, i) => (
            <p key={i} className="text-xs font-medium text-black text-center">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Info */}
      <p className="text-xs text-muted-foreground text-center">
        {t('assets.code128Format')} • {sizeSpec.label} • 300 DPI
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
