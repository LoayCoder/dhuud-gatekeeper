import { useRef } from "react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Share2,
  MapPin,
  Calendar,
  Package,
  Truck,
  User,
  Building2,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import type {
  PublicGatePassStatusResponse,
  WorkflowStep,
} from "@/types/public-gate-pass.types";
import {
  getStatusDisplayInfo,
  getPassTypeDisplay,
} from "@/hooks/public-gate-pass/use-public-gate-pass-status";

interface PublicStatusPageProps {
  statusData: PublicGatePassStatusResponse;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function PublicStatusPage({
  statusData,
  isLoading,
  isError,
  refetch,
}: PublicStatusPageProps) {
  const passRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-8 w-48 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-48 w-48 mx-auto" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !statusData.success || !statusData.data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md border-destructive">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-destructive mb-2">
              Gate Pass Not Found
            </h2>
            <p className="text-muted-foreground mb-4">
              {statusData.error || "The gate pass could not be found or the link has expired."}
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = statusData.data;
  const workflowSteps = statusData.workflow_steps || [];
  const statusInfo = getStatusDisplayInfo(data.status);
  const passTypeInfo = getPassTypeDisplay(data.pass_type);
  const isApproved = data.status === "approved";
  const isRejected = data.status === "rejected";

  const handleDownload = async () => {
    if (!passRef.current) return;

    try {
      const canvas = await html2canvas(passRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = `gate-pass-${data.reference_number}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("Gate pass saved successfully");
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Failed to save gate pass");
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `Gate Pass ${data.reference_number} - ${data.tenant?.name || ""}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          await navigator.clipboard.writeText(shareUrl);
          toast.success("Link copied to clipboard");
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    }
  };

  // Brand color style
  const brandStyle = data.tenant?.brand_color
    ? { backgroundColor: `hsl(${data.tenant.brand_color})` }
    : {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Main Pass Card */}
        <Card className="overflow-hidden" ref={passRef}>
          {/* Header */}
          <div
            className="bg-primary text-primary-foreground p-6 text-center"
            style={brandStyle}
          >
            {data.tenant?.logo_url ? (
              <img
                src={data.tenant.logo_url}
                alt={data.tenant.name || ""}
                className="h-12 mx-auto mb-3 object-contain"
              />
            ) : (
              <Truck className="h-10 w-10 mx-auto mb-3" />
            )}
            <h1 className="text-xl font-bold">Material Gate Pass</h1>
            <p className="text-primary-foreground/80 text-sm">
              {data.tenant?.name}
            </p>
            <p className="text-primary-foreground/60 text-xs mt-1">
              Ref: {data.reference_number}
            </p>
          </div>

          <CardContent className="pt-6 space-y-6">
            {/* Status Badge */}
            <div className="flex justify-center">
              <Badge
                className={`text-sm px-4 py-2 ${statusInfo.bgColor} ${statusInfo.color} border-0`}
              >
                {data.status === "approved" && (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                {data.status === "rejected" && (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                {!isApproved && !isRejected && (
                  <Clock className="h-4 w-4 mr-2" />
                )}
                {statusInfo.label}
              </Badge>
            </div>

            {/* Workflow Steps */}
            <div className="relative">
              <div className="flex justify-between items-center">
                {workflowSteps.map((step, index) => (
                  <div key={step.step} className="flex flex-col items-center relative z-10">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step.isComplete
                          ? step.label === "Rejected"
                            ? "bg-red-500 text-white"
                            : "bg-green-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step.isComplete ? (
                        step.label === "Rejected" ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )
                      ) : (
                        step.step
                      )}
                    </div>
                    <span className="text-xs mt-1 text-center max-w-[80px]">
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              {/* Progress line */}
              <div className="absolute top-4 left-8 right-8 h-0.5 bg-muted -z-0">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{
                    width: `${
                      ((workflowSteps.filter((s) => s.isComplete).length - 1) /
                        (workflowSteps.length - 1)) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* QR Code (only for approved) */}
            {isApproved && data.qr_code_token && (
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg shadow-inner border">
                  <QRCodeSVG
                    value={`GATEPASS:${data.qr_code_token}`}
                    size={180}
                    level="H"
                  />
                </div>
              </div>
            )}

            {/* Rejection Reason */}
            {isRejected && data.rejection_reason && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Reason:</strong> {data.rejection_reason}
                </p>
              </div>
            )}

            {/* Pass Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <User className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Requester</p>
                  <p className="font-medium">{data.public_requester_name}</p>
                </div>
              </div>

              {data.public_requester_company && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="font-medium">{data.public_requester_company}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Package className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Materials</p>
                  <p className="font-medium">{data.material_description}</p>
                  {data.quantity && (
                    <p className="text-sm text-muted-foreground">
                      Qty: {data.quantity}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Date & Time</p>
                  <p className="font-medium">
                    {format(new Date(data.pass_date), "PPP")}
                  </p>
                  {(data.time_window_start || data.time_window_end) && (
                    <p className="text-sm text-muted-foreground">
                      {data.time_window_start || "00:00"} -{" "}
                      {data.time_window_end || "23:59"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Truck className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Pass Type</p>
                  <p className="font-medium">{passTypeInfo.label}</p>
                  {data.vehicle_plate && (
                    <p className="text-sm text-muted-foreground">
                      Vehicle: {data.vehicle_plate}
                    </p>
                  )}
                </div>
              </div>

              {data.branch && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <MapPin className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium">{data.branch.name}</p>
                    {data.branch.address && (
                      <p className="text-sm text-muted-foreground">
                        {data.branch.address}
                      </p>
                    )}
                  </div>
                  {data.branch.google_maps_url && (
                    <a
                      href={data.branch.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Approval Info */}
            {isApproved && data.approved_at && (
              <div className="text-center text-sm text-muted-foreground border-t pt-4">
                <p>
                  Approved on {format(new Date(data.approved_at), "PPP 'at' p")}
                </p>
                {data.approved_by_name && <p>by {data.approved_by_name}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isApproved && (
            <Button variant="outline" className="flex-1" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Save Pass
            </Button>
          )}
          <Button variant="outline" className="flex-1" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Instructions */}
        {isApproved && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4">
              <p className="text-sm text-green-800 text-center">
                Please show this QR code to the security guard at the gate.
              </p>
            </CardContent>
          </Card>
        )}

        {!isApproved && !isRejected && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <p className="text-sm text-amber-800 text-center">
                Your request is being reviewed. You will receive a WhatsApp notification once it's approved.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Last updated: {format(new Date(data.updated_at), "PPP 'at' p")}
        </p>
      </div>
    </div>
  );
}
