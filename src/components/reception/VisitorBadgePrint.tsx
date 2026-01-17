/**
 * Visitor Badge Print Component
 * Generates and prints a visitor badge with QR code.
 */
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, Download, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { Visitor } from '@/hooks/use-visitors';
import { useAuth } from '@/contexts/AuthContext';

interface VisitorBadgePrintProps {
  visitor: Visitor;
}

export function VisitorBadgePrint({ visitor }: VisitorBadgePrintProps) {
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();
  const tenantName = 'Company'; // Simplified for badge
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setIsPrinting(false);
      return;
    }

    const badgeHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Visitor Badge - ${visitor.full_name}</title>
        <style>
          @page { size: 85mm 55mm; margin: 0; }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #f0f0f0;
          }
          .badge {
            width: 85mm;
            height: 55mm;
            background: white;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 8mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 4mm;
          }
          .company-logo {
            font-size: 14px;
            font-weight: bold;
            color: #333;
          }
          .badge-type {
            background: #dc2626;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
          }
          .visitor-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 2mm;
          }
          .visitor-company {
            font-size: 11px;
            color: #666;
            margin-bottom: 4mm;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
          }
          .info-left {
            flex: 1;
          }
          .info-item {
            font-size: 9px;
            color: #666;
            margin-bottom: 1mm;
          }
          .info-item strong {
            color: #333;
          }
          .qr-code {
            width: 20mm;
            height: 20mm;
          }
          .qr-code svg {
            width: 100%;
            height: 100%;
          }
          .footer {
            margin-top: auto;
            text-align: center;
            font-size: 8px;
            color: #999;
          }
          @media print {
            body { background: white; }
            .badge { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="badge">
          <div class="header">
            <div class="company-logo">${tenantName}</div>
            <div class="badge-type">VISITOR</div>
          </div>
          <div class="visitor-name">${visitor.full_name}</div>
          <div class="visitor-company">${visitor.company_name || '-'}</div>
          <div class="info-row">
            <div class="info-left">
              <div class="info-item"><strong>Host:</strong> ${visitor.host_name || 'Reception'}</div>
              <div class="info-item"><strong>Date:</strong> ${format(new Date(), 'dd/MM/yyyy')}</div>
              <div class="info-item"><strong>Valid Until:</strong> ${visitor.visit_end_time ? format(new Date(visitor.visit_end_time), 'HH:mm') : 'End of Day'}</div>
            </div>
            <div class="qr-code" id="qr-container"></div>
          </div>
          <div class="footer">Please return this badge to reception upon departure</div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
        <script>
          QRCode.toDataURL('${visitor.qr_code_token}', { width: 80, margin: 0 }, function(err, url) {
            if (!err) {
              document.getElementById('qr-container').innerHTML = '<img src="' + url + '" style="width:100%;height:100%">';
            }
          });
          setTimeout(function() { window.print(); window.close(); }, 500);
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(badgeHtml);
    printWindow.document.close();
    setIsPrinting(false);
  };

  return (
    <div className="space-y-4">
      {/* Badge Preview */}
      <div 
        ref={printRef}
        className="border rounded-lg p-4 bg-white"
        style={{ maxWidth: '340px', margin: '0 auto' }}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="font-bold text-sm">{tenantName}</div>
          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded font-medium">
            VISITOR
          </span>
        </div>
        
        <div className="font-bold text-lg mb-1">{visitor.full_name}</div>
        <div className="text-sm text-muted-foreground mb-3">{visitor.company_name || '-'}</div>
        
        <div className="flex justify-between items-end">
          <div className="space-y-1 text-xs">
            <div><span className="text-muted-foreground">{t('visitors.host', 'Host')}:</span> {visitor.host_name || 'Reception'}</div>
            <div><span className="text-muted-foreground">{t('common.date', 'Date')}:</span> {format(new Date(), 'dd/MM/yyyy')}</div>
          </div>
          
          {visitor.qr_code_token && (
            <div className="border rounded p-1">
              <QRCodeSVG value={visitor.qr_code_token} size={60} />
            </div>
          )}
        </div>
      </div>

      {/* Print Button */}
      <Button 
        className="w-full" 
        onClick={handlePrint}
        disabled={isPrinting}
      >
        <Printer className="h-4 w-4 me-2" />
        {isPrinting ? t('common.printing', 'Printing...') : t('reception.printBadge', 'Print Badge')}
      </Button>
    </div>
  );
}
