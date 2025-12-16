import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LabelSettings, getLabelSizeSpec, DEFAULT_LABEL_SETTINGS } from './label-settings-types';

interface AssetQRCodeProps {
  assetId: string;
  assetCode: string;
  assetName?: string;
  siteName?: string;
  zoneName?: string;
  categoryName?: string;
  serialNumber?: string;
  departmentName?: string;
  size?: number;
  settings?: LabelSettings;
}

const mmToPx = (mm: number, dpi: number = 300) => Math.round((mm / 25.4) * dpi);

export function AssetQRCode({ 
  assetId, 
  assetCode, 
  assetName,
  siteName,
  zoneName,
  categoryName,
  serialNumber,
  departmentName,
  size = 180,
  settings = DEFAULT_LABEL_SETTINGS,
}: AssetQRCodeProps) {
  const { t } = useTranslation();
  const qrRef = useRef<HTMLDivElement>(null);
  const sizeSpec = getLabelSizeSpec(settings.size);
  
  const qrValue = `${window.location.origin}/assets/${assetId}`;

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
  
  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    
    const LABEL_WIDTH_PX = mmToPx(sizeSpec.widthMM);
    const LABEL_HEIGHT_PX = mmToPx(sizeSpec.heightMM);
    const QUIET_ZONE_PX = mmToPx(2);
    const QR_SIZE_PX = Math.min(mmToPx(sizeSpec.heightMM - 4), LABEL_HEIGHT_PX * 0.8);
    
    const canvas = document.createElement('canvas');
    canvas.width = LABEL_WIDTH_PX;
    canvas.height = LABEL_HEIGHT_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, LABEL_WIDTH_PX, LABEL_HEIGHT_PX);
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    img.onload = () => {
      const qrX = QUIET_ZONE_PX;
      const qrY = (LABEL_HEIGHT_PX - QR_SIZE_PX) / 2;
      ctx.drawImage(img, qrX, qrY, QR_SIZE_PX, QR_SIZE_PX);
      
      const textAreaX = qrX + QR_SIZE_PX + mmToPx(2);
      const textAreaWidth = LABEL_WIDTH_PX - textAreaX - QUIET_ZONE_PX;
      const textCenterX = textAreaX + (textAreaWidth / 2);
      
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const contentLines = [assetCode, ...getContentLines()];
      const fontSize = Math.max(12, Math.min(24, LABEL_HEIGHT_PX * 0.08));
      const lineHeight = fontSize * 1.3;
      const totalTextHeight = contentLines.length * lineHeight;
      const startY = (LABEL_HEIGHT_PX - totalTextHeight) / 2 + fontSize / 2;
      
      contentLines.forEach((line, i) => {
        const isFirst = i === 0;
        ctx.font = isFirst ? `bold ${fontSize}px Arial, sans-serif` : `${fontSize * 0.85}px Arial, sans-serif`;
        ctx.fillStyle = isFirst ? '#000000' : '#333333';
        ctx.fillText(line, textCenterX, startY + i * lineHeight, textAreaWidth - 10);
      });
      
      const link = document.createElement('a');
      link.download = `${assetCode}-label-300dpi.png`;
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
    const effectiveQrSize = sizeSpec.heightMM - 4;
    const contentLines = getContentLines();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${assetCode} - Asset Label</title>
          <style>
            @page {
              size: ${sizeSpec.widthMM}mm ${sizeSpec.heightMM}mm;
              margin: 0;
            }
            @media print {
              html, body {
                width: ${sizeSpec.widthMM}mm;
                height: ${sizeSpec.heightMM}mm;
                margin: 0;
                padding: 0;
              }
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
              flex-direction: row;
              align-items: center;
              padding: 2mm;
              background: white;
              font-family: Arial, Helvetica, sans-serif;
            }
            .qr-container {
              width: ${effectiveQrSize}mm;
              height: ${effectiveQrSize}mm;
              flex-shrink: 0;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .qr-container svg {
              width: 100%;
              height: 100%;
            }
            .text-container {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              padding-left: 2mm;
              overflow: hidden;
            }
            .asset-id {
              font-size: ${sizeSpec.heightMM > 30 ? '9pt' : '8pt'};
              font-weight: bold;
              text-align: center;
              color: #000000;
              word-break: break-all;
              max-width: 100%;
            }
            .content-line {
              font-size: ${sizeSpec.heightMM > 30 ? '7pt' : '6pt'};
              text-align: center;
              color: #333333;
              margin-top: 1mm;
              max-width: 100%;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">${svgData}</div>
          <div class="text-container">
            <div class="asset-id">${assetCode}</div>
            ${contentLines.map(line => `<div class="content-line">${line}</div>`).join('')}
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

  const contentLines = getContentLines();

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code Preview */}
      <div ref={qrRef} className="p-4 bg-white rounded-lg border">
        <QRCodeSVG
          value={qrValue}
          size={size}
          level="H"
          marginSize={0}
          bgColor="#FFFFFF"
          fgColor="#000000"
        />
      </div>
      
      {/* Label Preview Info */}
      <div className="text-center space-y-1">
        <p className="font-mono font-bold text-sm">{assetCode}</p>
        {contentLines.map((line, i) => (
          <p key={i} className="text-xs text-muted-foreground">{line}</p>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground text-center">
        {t('assets.labelSize')}: {sizeSpec.label} | Level H | 300 DPI
      </p>
      
      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 me-2" />
          {t('assets.download300dpi')}
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 me-2" />
          {t('common.print')}
        </Button>
      </div>
    </div>
  );
}
