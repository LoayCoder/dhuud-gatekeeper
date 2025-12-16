import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface AssetQRCodeProps {
  assetId: string;
  assetCode: string;
  assetName: string;
  siteName?: string;
  zoneName?: string;
  size?: number;
}

// Industrial label specifications - 30mm × 20mm landscape format
const LABEL_SPECS = {
  LABEL_WIDTH_MM: 30,
  LABEL_HEIGHT_MM: 20,
  QR_SIZE_MM: 15,
  QUIET_ZONE_MM: 2,
  DPI: 300,
};

// Convert mm to pixels at 300 DPI
const mmToPx = (mm: number, dpi: number = LABEL_SPECS.DPI) => Math.round((mm / 25.4) * dpi);

export function AssetQRCode({ 
  assetId, 
  assetCode, 
  assetName, 
  siteName,
  zoneName,
  size = 180 
}: AssetQRCodeProps) {
  const { t } = useTranslation();
  const qrRef = useRef<HTMLDivElement>(null);
  const [includeZone, setIncludeZone] = useState(true);
  
  // Dynamic QR - URL to asset detail page
  const qrValue = `${window.location.origin}/assets/${assetId}`;
  
  // Get zone/site code for label
  const locationCode = zoneName || siteName || '';
  
  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    
    // High resolution at 300 DPI - landscape layout
    const LABEL_WIDTH_PX = mmToPx(LABEL_SPECS.LABEL_WIDTH_MM);
    const LABEL_HEIGHT_PX = mmToPx(LABEL_SPECS.LABEL_HEIGHT_MM);
    const QUIET_ZONE_PX = mmToPx(LABEL_SPECS.QUIET_ZONE_MM);
    const QR_SIZE_PX = mmToPx(LABEL_SPECS.QR_SIZE_MM - (LABEL_SPECS.QUIET_ZONE_MM * 2));
    
    const canvas = document.createElement('canvas');
    canvas.width = LABEL_WIDTH_PX;
    canvas.height = LABEL_HEIGHT_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, LABEL_WIDTH_PX, LABEL_HEIGHT_PX);
    
    // Draw QR code
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    img.onload = () => {
      // QR on left side with quiet zone, vertically centered
      const qrX = QUIET_ZONE_PX;
      const qrY = (LABEL_HEIGHT_PX - QR_SIZE_PX) / 2;
      ctx.drawImage(img, qrX, qrY, QR_SIZE_PX, QR_SIZE_PX);
      
      // Text area starts after QR + small gap
      const textAreaX = qrX + QR_SIZE_PX + mmToPx(2);
      const textAreaWidth = LABEL_WIDTH_PX - textAreaX - QUIET_ZONE_PX;
      const textCenterX = textAreaX + (textAreaWidth / 2);
      
      // Draw Asset ID text
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Asset ID - larger, bold
      const assetIdFontSize = Math.round(LABEL_HEIGHT_PX * 0.12);
      ctx.font = `bold ${assetIdFontSize}px Arial, sans-serif`;
      
      // Calculate vertical positions
      const hasZone = includeZone && locationCode;
      const centerY = LABEL_HEIGHT_PX / 2;
      
      if (hasZone) {
        // Two lines: Asset ID above center, Zone below
        ctx.fillText(assetCode, textCenterX, centerY - assetIdFontSize * 0.6);
        
        const zoneFontSize = Math.round(LABEL_HEIGHT_PX * 0.09);
        ctx.font = `${zoneFontSize}px Arial, sans-serif`;
        ctx.fillStyle = '#333333';
        ctx.fillText(locationCode, textCenterX, centerY + zoneFontSize * 0.8);
      } else {
        // Single line: Asset ID centered
        ctx.fillText(assetCode, textCenterX, centerY);
      }
      
      // Download as PNG
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
    const { LABEL_WIDTH_MM, LABEL_HEIGHT_MM, QR_SIZE_MM, QUIET_ZONE_MM } = LABEL_SPECS;
    const effectiveQrSize = QR_SIZE_MM - (QUIET_ZONE_MM * 2);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${assetCode} - Asset Label</title>
          <style>
            @page {
              size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm;
              margin: 0;
            }
            @media print {
              html, body {
                width: ${LABEL_WIDTH_MM}mm;
                height: ${LABEL_HEIGHT_MM}mm;
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
              width: ${LABEL_WIDTH_MM}mm;
              height: ${LABEL_HEIGHT_MM}mm;
              display: flex;
              flex-direction: row;
              align-items: center;
              padding: ${QUIET_ZONE_MM}mm;
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
              font-size: 8pt;
              font-weight: bold;
              text-align: center;
              color: #000000;
              word-break: break-all;
              max-width: 100%;
            }
            .zone-code {
              font-size: 6pt;
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
            ${includeZone && locationCode ? `<div class="zone-code">${locationCode}</div>` : ''}
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
          {includeZone && locationCode && (
            <p className="text-xs text-muted-foreground">{locationCode}</p>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          {t('assets.labelSize')}: 30×20mm | {t('assets.qrSize')}: 15×15mm | Level H | 300 DPI
        </p>
        
        {/* Include Zone Option */}
        {locationCode && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="includeZone"
              checked={includeZone}
              onCheckedChange={(checked) => setIncludeZone(checked === true)}
            />
            <Label htmlFor="includeZone" className="text-sm cursor-pointer">
              {t('assets.includeZoneCode')}
            </Label>
          </div>
        )}
        
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
      </CardContent>
    </Card>
  );
}
