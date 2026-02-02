import { useState } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { X, Download, Share2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FullScreenQRViewProps {
  token: string;
  referenceNumber: string;
  onClose: () => void;
}

export function FullScreenQRView({ token, referenceNumber, onClose }: FullScreenQRViewProps) {
  const { t } = useTranslation();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("gatePasses.shareTitle", "Gate Pass"),
          text: `${t("gatePasses.shareText", "Gate Pass Reference")}: ${referenceNumber}`,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(token);
      toast.success(t("common.copied", "Copied to clipboard"));
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById("qr-code-fullscreen");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = 400;
    canvas.height = 400;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `gate-pass-${referenceNumber}.png`;
        downloadLink.click();
      }
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(20);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="absolute top-4 end-4 h-12 w-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        onClick={onClose}
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        <X className="h-6 w-6 text-white" />
      </button>

      {/* QR Code */}
      <div
        className="bg-white p-6 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <QRCodeSVG
          id="qr-code-fullscreen"
          value={token}
          size={280}
          level="H"
          includeMargin
        />
      </div>

      {/* Reference number */}
      <div className="mt-6 text-center">
        <p className="text-white/60 text-sm">{t("gatePasses.reference", "Reference")}</p>
        <p className="text-white text-xl font-mono font-bold mt-1">{referenceNumber}</p>
      </div>

      {/* Action buttons */}
      <div
        className="flex gap-4 mt-8"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="outline"
          size="lg"
          onClick={handleDownload}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-14 px-6"
        >
          <Download className="h-5 w-5 me-2" />
          {t("common.download", "Download")}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={handleShare}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20 h-14 px-6"
        >
          <Share2 className="h-5 w-5 me-2" />
          {t("common.share", "Share")}
        </Button>
      </div>

      {/* Hint text */}
      <p className="absolute bottom-8 text-white/40 text-sm">
        {t("gatePasses.tapToClose", "Tap anywhere to close")}
      </p>
    </div>
  );
}

interface QRCodeSectionProps {
  token: string | null | undefined;
  referenceNumber: string;
  status: string;
  size?: number;
}

export function QRCodeSection({ token, referenceNumber, status, size = 180 }: QRCodeSectionProps) {
  const { t } = useTranslation();
  const [showFullScreen, setShowFullScreen] = useState(false);

  const isApproved = status === "approved" || status === "used" || status === "completed";

  if (!token || !isApproved) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-muted/50 rounded-xl border border-dashed">
        <div className="h-24 w-24 bg-muted rounded-lg flex items-center justify-center mb-3">
          <Maximize2 className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          {t("gatePasses.qrPendingApproval", "QR code will be available after approval")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setShowFullScreen(true)}
      >
        <QRCodeSVG value={token} size={size} level="H" includeMargin />
        <p className="mt-3 text-sm text-muted-foreground flex items-center gap-1">
          <Maximize2 className="h-3 w-3" />
          {t("gatePasses.tapToEnlarge", "Tap to enlarge")}
        </p>
      </div>

      {showFullScreen && (
        <FullScreenQRView
          token={token}
          referenceNumber={referenceNumber}
          onClose={() => setShowFullScreen(false)}
        />
      )}
    </>
  );
}
