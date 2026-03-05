import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface WorkerQRCodeProps {
  workerId: string;
  workerName: string;
  qrData?: {
    token: string;
    expires_at: string;
    is_active: boolean;
    project_name?: string;
  } | null;
  onGenerateQR?: () => void;
  isGenerating?: boolean;
  disabled?: boolean;
}

export function WorkerQRCode({ workerId, workerName, qrData, onGenerateQR, isGenerating, disabled }: WorkerQRCodeProps) {
  const { t } = useTranslation();

  const handleDownload = () => {
    const svg = document.getElementById(`qr-${workerId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `worker-qr-${workerId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const isExpired = qrData?.expires_at && new Date(qrData.expires_at) < new Date();
  const isActive = qrData?.is_active && !isExpired;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{t("contractors.workers.qrCode", "QR Code")}</span>
          {qrData && (
            <Badge variant={isActive ? "default" : "destructive"}>
              {isActive 
                ? t("contractors.workers.qrActive", "Active") 
                : t("contractors.workers.qrExpired", "Expired")}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {qrData && isActive ? (
          <>
            <div className="flex justify-center p-4 bg-background rounded-lg border">
              <QRCodeSVG
                id={`qr-${workerId}`}
                value={qrData.token}
                size={180}
                level="H"
                includeMargin
              />
            </div>
            <div className="text-sm text-center space-y-1">
              <p className="font-medium">{workerName}</p>
              {qrData.project_name && (
                <p className="text-muted-foreground">{qrData.project_name}</p>
              )}
              <p className="text-muted-foreground text-xs">
                {t("contractors.workers.expiresAt", "Expires")}: {format(new Date(qrData.expires_at), "PPp")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={handleDownload}>
                <Download className="h-4 w-4 me-1" />
                {t("common.download", "Download")}
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={onGenerateQR} disabled={isGenerating}>
                <RefreshCw className={`h-4 w-4 me-1 ${isGenerating ? "animate-spin" : ""}`} />
                {t("contractors.workers.regenerate", "Regenerate")}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6 space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {qrData 
                ? t("contractors.workers.qrExpiredMessage", "QR code has expired") 
                : t("contractors.workers.noQrCode", "No QR code generated")}
            </p>
            <Button onClick={onGenerateQR} disabled={isGenerating || disabled}>
              <RefreshCw className={`h-4 w-4 me-1 ${isGenerating ? "animate-spin" : ""}`} />
              {t("contractors.workers.generateQr", "Generate QR Code")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
