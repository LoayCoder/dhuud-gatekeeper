import { useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  MapPin,
  Phone,
  Package,
  Truck,
  Calendar,
  User,
  Building2,
  ExternalLink,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  usePublicGatePassStatus,
  usePublicGatePassRealtime,
} from "@/hooks/public-gate-pass";
import { format } from "date-fns";

// Status configuration
const STATUS_CONFIG: Record<
  string,
  { label: string; labelAr: string; color: string; icon: React.ReactNode; step: number }
> = {
  pending_mgmt: {
    label: "Submitted",
    labelAr: "تم التقديم",
    color: "bg-blue-500",
    icon: <Clock className="h-4 w-4" />,
    step: 1,
  },
  pending_club_mgmt_ack: {
    label: "Pending Management",
    labelAr: "في انتظار الإدارة",
    color: "bg-blue-500",
    icon: <Clock className="h-4 w-4" />,
    step: 1,
  },
  acknowledged: {
    label: "Acknowledged",
    labelAr: "تم الاستلام",
    color: "bg-amber-500",
    icon: <CheckCircle2 className="h-4 w-4" />,
    step: 2,
  },
  pending_security_approval: {
    label: "Pending Security",
    labelAr: "في انتظار الأمن",
    color: "bg-amber-500",
    icon: <Clock className="h-4 w-4" />,
    step: 2,
  },
  pending_pm: {
    label: "Under Review",
    labelAr: "قيد المراجعة",
    color: "bg-amber-500",
    icon: <Clock className="h-4 w-4" />,
    step: 2,
  },
  pending_safety: {
    label: "Safety Review",
    labelAr: "مراجعة السلامة",
    color: "bg-amber-500",
    icon: <Clock className="h-4 w-4" />,
    step: 2,
  },
  approved: {
    label: "Approved",
    labelAr: "تمت الموافقة",
    color: "bg-green-500",
    icon: <CheckCircle2 className="h-4 w-4" />,
    step: 3,
  },
  rejected: {
    label: "Rejected",
    labelAr: "مرفوض",
    color: "bg-red-500",
    icon: <XCircle className="h-4 w-4" />,
    step: -1,
  },
  used: {
    label: "Used",
    labelAr: "مستخدم",
    color: "bg-gray-500",
    icon: <CheckCircle2 className="h-4 w-4" />,
    step: 4,
  },
  expired: {
    label: "Expired",
    labelAr: "منتهي الصلاحية",
    color: "bg-gray-500",
    icon: <AlertTriangle className="h-4 w-4" />,
    step: -1,
  },
  cancelled: {
    label: "Cancelled",
    labelAr: "ملغي",
    color: "bg-gray-500",
    icon: <XCircle className="h-4 w-4" />,
    step: -1,
  },
  completed: {
    label: "Completed",
    labelAr: "مكتمل",
    color: "bg-green-600",
    icon: <CheckCircle2 className="h-4 w-4" />,
    step: 4,
  },
};

// Stepper steps
const STEPS = [
  { step: 1, label: "Submitted", labelAr: "تم التقديم" },
  { step: 2, label: "Acknowledged", labelAr: "تم الاستلام" },
  { step: 3, label: "Approved", labelAr: "تمت الموافقة" },
];

interface StepperProps {
  currentStep: number;
  isRejected: boolean;
  isRTL: boolean;
}

function StatusStepper({ currentStep, isRejected, isRTL }: StepperProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {STEPS.map((step, index) => {
        const isActive = currentStep >= step.step;
        const isCurrent = currentStep === step.step;

        return (
          <div key={step.step} className="flex items-center flex-1">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                  transition-colors duration-300
                  ${
                    isRejected && currentStep === step.step
                      ? "bg-red-500 text-white"
                      : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }
                  ${isCurrent && !isRejected ? "ring-2 ring-primary ring-offset-2" : ""}
                `}
              >
                {isActive && !isRejected ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : isRejected && currentStep === step.step ? (
                  <XCircle className="h-5 w-5" />
                ) : (
                  step.step
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {isRTL ? step.labelAr : step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < STEPS.length - 1 && (
              <div
                className={`
                  flex-1 h-1 mx-2 rounded-full transition-colors duration-300
                  ${currentStep > step.step ? "bg-primary" : "bg-muted"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PublicStatusPage() {
  const { tenantSlug, token } = useParams<{ tenantSlug: string; token: string }>();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = usePublicGatePassStatus(tenantSlug, token);

  // Memoize the callback to prevent unnecessary re-subscriptions
  const handleRealtimeUpdate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["public-gate-pass-status", tenantSlug, token],
    });
  }, [queryClient, tenantSlug, token]);

  // Set up real-time updates - hook manages its own lifecycle via useEffect
  usePublicGatePassRealtime(data?.gate_pass?.id, handleRealtimeUpdate);

  // Apply tenant branding
  const brandColor = data?.tenant?.brand_color || "221.2 83.2% 53.3%";
  const brandStyle = {
    "--primary": brandColor,
  } as React.CSSProperties;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background p-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className="max-w-lg mx-auto space-y-6">
          <Skeleton className="h-16 w-32 mx-auto" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-48 w-48 mx-auto rounded-lg" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data?.success || !data?.gate_pass) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <Card className="w-full max-w-md border-destructive">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-destructive mb-2">
              {isRTL ? "تصريح غير صالح" : "Invalid Pass"}
            </h2>
            <p className="text-muted-foreground mb-4">
              {data?.error ||
                (isRTL
                  ? "لم يتم العثور على تصريح المرور أو انتهت صلاحيته"
                  : "Gate pass not found or has expired")}
            </p>
            <Link to={`/${tenantSlug}/request`}>
              <Button variant="outline">
                {isRTL ? "تقديم طلب جديد" : "Submit New Request"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gatePass = data.gate_pass;
  const branch = data.branch;
  const tenant = data.tenant;

  const statusConfig = STATUS_CONFIG[gatePass.status] || STATUS_CONFIG.pending_mgmt;
  const isApproved = gatePass.status === "approved";
  const isRejected = gatePass.status === "rejected";
  const isCompleted = gatePass.status === "completed" || gatePass.status === "used";

  const trackingUrl = `${window.location.origin}/${tenantSlug}/track/${token}`;

  const instructions = isRTL
    ? tenant?.instructions_ar || tenant?.instructions
    : tenant?.instructions || tenant?.instructions_ar;

  // Google Maps URL
  const mapsUrl =
    branch?.latitude && branch?.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`
      : null;

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-primary/5 to-background p-4 pb-safe"
      dir={isRTL ? "rtl" : "ltr"}
      style={brandStyle}
    >
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header with Tenant Branding */}
        <div className="text-center pt-4 space-y-2">
          {tenant?.logo_url && (
            <img
              src={tenant.logo_url}
              alt={tenant.name || ""}
              className="h-12 mx-auto object-contain"
            />
          )}
          <h1 className="text-xl font-bold">{tenant?.name}</h1>
        </div>

        {/* Status Card */}
        <Card className="overflow-hidden">
          <div
            className={`${statusConfig.color} text-white p-4 text-center`}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              {statusConfig.icon}
              <span className="font-bold text-lg">
                {isRTL ? statusConfig.labelAr : statusConfig.label}
              </span>
            </div>
            <p className="text-sm opacity-90">
              {gatePass.reference_number}
            </p>
          </div>

          <CardContent className="pt-6 space-y-6">
            {/* Status Stepper */}
            {!isCompleted && (
              <StatusStepper
                currentStep={statusConfig.step}
                isRejected={isRejected}
                isRTL={isRTL}
              />
            )}

            {/* Rejection Reason */}
            {isRejected && gatePass.rejection_reason && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>{isRTL ? "سبب الرفض" : "Rejection Reason"}</AlertTitle>
                <AlertDescription>{gatePass.rejection_reason}</AlertDescription>
              </Alert>
            )}

            {/* QR Code for Approved Passes */}
            {isApproved && (
              <div className="text-center space-y-4">
                <div className="bg-white p-4 rounded-lg shadow-inner inline-block">
                  <QRCodeSVG
                    value={`GATE_PASS:${gatePass.id}:${token}`}
                    size={180}
                    level="H"
                    includeMargin
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {isRTL
                    ? "اعرض رمز QR هذا عند البوابة"
                    : "Show this QR code at the gate"}
                </p>
              </div>
            )}

            {/* Refresh Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4 me-2" />
              {isRTL ? "تحديث الحالة" : "Refresh Status"}
            </Button>
          </CardContent>
        </Card>

        {/* Gate Pass Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              {isRTL ? "تفاصيل التصريح" : "Pass Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Requester Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{gatePass.requester_name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{gatePass.requester_phone}</span>
              </div>
              {gatePass.requester_company && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{gatePass.requester_company}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Material Info */}
            <div className="space-y-2">
              <div className="flex items-start gap-3 text-sm">
                <Package className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {isRTL ? "وصف المواد" : "Materials"}
                  </p>
                  <p className="text-muted-foreground">
                    {gatePass.material_description}
                  </p>
                  {gatePass.quantity && (
                    <Badge variant="secondary" className="mt-1">
                      {gatePass.quantity}
                    </Badge>
                  )}
                </div>
              </div>

              {(gatePass.vehicle_plate || gatePass.driver_name) && (
                <div className="flex items-start gap-3 text-sm">
                  <Truck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    {gatePass.vehicle_plate && (
                      <p className="font-medium">{gatePass.vehicle_plate}</p>
                    )}
                    {gatePass.driver_name && (
                      <p className="text-muted-foreground">
                        {gatePass.driver_name}
                        {gatePass.driver_mobile && ` - ${gatePass.driver_mobile}`}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="font-medium">
                    {format(new Date(gatePass.pass_date), "PPP")}
                  </span>
                  {gatePass.time_window_start && (
                    <span className="text-muted-foreground">
                      {" "}
                      ({gatePass.time_window_start}
                      {gatePass.time_window_end && ` - ${gatePass.time_window_end}`})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Badge variant="outline">
                  {gatePass.pass_type === "in"
                    ? isRTL
                      ? "دخول"
                      : "Entry"
                    : gatePass.pass_type === "out"
                    ? isRTL
                      ? "خروج"
                      : "Exit"
                    : isRTL
                    ? "دخول وخروج"
                    : "Entry & Exit"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branch/Location Card */}
        {branch && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5" />
                {isRTL ? "الموقع" : "Location"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-medium">{branch.name}</p>
              {branch.address && (
                <p className="text-sm text-muted-foreground">{branch.address}</p>
              )}
              {branch.phone && (
                <a
                  href={`tel:${branch.phone}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {branch.phone}
                </a>
              )}

              {/* Open in Maps Button */}
              {mapsUrl && (
                <Button variant="outline" className="w-full" asChild>
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4 me-2" />
                    {isRTL ? "فتح في الخرائط" : "Open in Maps"}
                    <ExternalLink className="h-4 w-4 ms-2" />
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons for Approved Passes */}
        {isApproved && (
          <div className="space-y-3">
            {/* Download PDF Button */}
            <Button className="w-full h-12" asChild>
              <a
                href={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-public-gate-pass-pdf?token=${token}&tenant=${tenantSlug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-5 w-5 me-2" />
                {isRTL ? "تحميل التصريح PDF" : "Download PDF Pass"}
              </a>
            </Button>
          </div>
        )}

        {/* Instructions */}
        {instructions && (
          <Alert className="border-primary/50 bg-primary/5">
            <Package className="h-5 w-5" />
            <AlertTitle>{isRTL ? "تعليمات" : "Instructions"}</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap text-sm">
              {instructions}
            </AlertDescription>
          </Alert>
        )}

        {/* Footer */}
        <div className="text-center space-y-2 pt-2">
          <p className="text-xs text-muted-foreground">
            {isRTL
              ? "تم تقديم الطلب في"
              : "Request submitted on"}{" "}
            {format(new Date(gatePass.created_at), "PPp")}
          </p>
          {!isApproved && !isRejected && (
            <Link to={`/${tenantSlug}/request`}>
              <Button variant="link" size="sm">
                {isRTL ? "تقديم طلب جديد" : "Submit Another Request"}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
