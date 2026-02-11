import { useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  ArrowRight,
  ArrowLeft,
  Timer,
  ShieldCheck,
  Check
} from "lucide-react";
import {
  usePublicGatePassStatus,
  usePublicGatePassRealtime,
} from "@/hooks/public-gate-pass";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Detailed Status Configuration
const STATUS_CONFIG: Record<
  string,
  { label: string; labelAr: string; color: string; icon: React.ElementType; description?: string; descriptionAr?: string }
> = {
  // Initial Stages
  pending_mgmt: {
    label: "Under Review",
    labelAr: "قيد المراجعة",
    color: "text-blue-500",
    icon: Clock,
    description: "Request submitted and waiting for management approval",
    descriptionAr: "تم استلام الطلب وبانتظار موافقة الإدارة"
  },
  pending_club_mgmt_ack: {
    label: "Management Ack.",
    labelAr: "تأكيد الإدارة",
    color: "text-blue-500",
    icon: Clock,
  },
  acknowledged: {
    label: "Acknowledged",
    labelAr: "تم الاستلام",
    color: "text-amber-500",
    icon: CheckCircle2,
  },
  // Security / Safety Stages
  pending_security_approval: {
    label: "Security Review",
    labelAr: "مراجعة الأمن",
    color: "text-amber-500",
    icon: ShieldCheck,
  },
  pending_pm: {
    label: "Project Manager",
    labelAr: "مدير المشروع",
    color: "text-amber-500",
    icon: Clock,
  },
  pending_safety: {
    label: "Safety Review",
    labelAr: "مراجعة السلامة",
    color: "text-amber-500",
    icon: ShieldCheck,
  },
  // Final States
  approved: {
    label: "Approved",
    labelAr: "تمت الموافقة",
    color: "text-green-600",
    icon: CheckCircle2,
    description: "Gate pass is approved and ready for use",
    descriptionAr: "تمت الموافقة على التصريح وجاهز للاستخدام"
  },
  rejected: {
    label: "Rejected",
    labelAr: "مرفوض",
    color: "text-red-600",
    icon: XCircle,
    description: "Request was rejected",
    descriptionAr: "تم رفض الطلب"
  },
  // Usage States
  used: {
    label: "Active / Entered",
    labelAr: "نشط / تم الدخول",
    color: "text-indigo-600",
    icon: Truck,
    description: "Vehicle has entered the facility",
    descriptionAr: "المركبة دخلت المنشأة"
  },
  completed: {
    label: "Completed",
    labelAr: "مكتمل",
    color: "text-gray-600",
    icon: Check,
    description: "Cycle completed (Exit recorded)",
    descriptionAr: "تمت العملية (تم تسجيل الخروج)"
  },
  expired: {
    label: "Expired",
    labelAr: "منتهي",
    color: "text-gray-400",
    icon: Timer,
  },
  cancelled: {
    label: "Cancelled",
    labelAr: "ملغي",
    color: "text-gray-400",
    icon: XCircle,
  },
};

// Timeline Steps Definition
// We map the granular statuses to 4 main visible steps for the timeline
const TIMELINE_STEPS = [
  { id: 'submitted', label: 'Submitted', labelAr: 'تم التقديم', icon: FileText },
  { id: 'review', label: 'Review', labelAr: 'المراجعة', icon: Clock },
  { id: 'approved', label: 'Approved', labelAr: 'الموافقة', icon: CheckCircle2 },
  { id: 'completed', label: 'Completed', labelAr: 'الاكتمال', icon: Truck },
];

function getTimelineCurrentStep(status: string): number {
  if (['pending_mgmt', 'pending_club_mgmt_ack', 'acknowledged', 'pending_security_approval', 'pending_pm', 'pending_safety'].includes(status)) return 2;
  if (status === 'approved') return 3;
  if (['used', 'completed'].includes(status)) return 4;
  if (['rejected', 'cancelled', 'expired'].includes(status)) return 2; // Stops at review
  return 1;
}

export default function PublicStatusPage() {
  const { tenantSlug, token } = useParams<{ tenantSlug: string; token: string }>();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = usePublicGatePassStatus(tenantSlug, token);

  const handleRealtimeUpdate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["public-gate-pass-status", tenantSlug, token],
    });
  }, [queryClient, tenantSlug, token]);

  usePublicGatePassRealtime(data?.gate_pass?.id, handleRealtimeUpdate);

  const brandColor = data?.tenant?.brand_color || "221.2 83.2% 53.3%";
  const brandStyle = {
    "--primary": brandColor,
  } as React.CSSProperties;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background p-4 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !data?.success || !data?.gate_pass) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center" dir={isRTL ? "rtl" : "ltr"}>
        <Card className="w-full max-w-md border-destructive shadow-lg">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-destructive">
                {isRTL ? "عفواً، التصريح غير متاح" : "Invalid or Expired Pass"}
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                {data?.error || (isRTL ? "الرابط غير صحيح أو انتهت صلاحيته" : "Link is invalid or has expired")}
              </p>
            </div>
            <Button variant="outline" asChild className="mt-4">
              <Link to={`/${tenantSlug}/request`}>
                {isRTL ? "إنشاء طلب جديد" : "Create New Request"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { gate_pass: gatePass, branch, tenant } = data;
  const statusInfo = STATUS_CONFIG[gatePass.status] || STATUS_CONFIG.pending_mgmt;
  const currentTimelineStep = getTimelineCurrentStep(gatePass.status);
  const isRejected = gatePass.status === 'rejected' || gatePass.status === 'cancelled';
  const isCompleted = gatePass.status === 'used' || gatePass.status === 'expired';

  const mapsUrl = branch?.latitude && branch?.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`
    : null;

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background p-4 pb-12"
      dir={isRTL ? "rtl" : "ltr"}
      style={brandStyle}
    >
      <div className="max-w-md mx-auto space-y-5">

        {/* Header */}
        <div className="text-center pt-2 pb-4 space-y-2">
          {tenant?.logo_url && (
            <img src={tenant.logo_url} alt={tenant.name || ""} className="h-10 mx-auto object-contain" />
          )}
          <div className="inline-flex items-center gap-2 bg-background/50 px-3 py-1 rounded-full border shadow-sm">
            <span className="text-xs font-mono text-muted-foreground">#{gatePass.reference_number}</span>
          </div>
        </div>

        {/* Main Status Cards */}
        <div className="space-y-4">

          {/* 1. Status Overview & QR */}
          <Card className="overflow-hidden border-t-4 border-t-primary shadow-md">
            <CardContent className="p-0">
              <div className="p-6 text-center space-y-4">
                <div className={cn("inline-flex items-center justify-center p-3 rounded-full bg-muted/30", statusInfo.color)}>
                  <statusInfo.icon className="h-8 w-8" />
                </div>
                <div>
                  <h2 className={cn("text-2xl font-bold", statusInfo.color)}>
                    {isRTL ? statusInfo.labelAr : statusInfo.label}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isRTL ? statusInfo.descriptionAr : statusInfo.description}
                  </p>
                </div>

                {gatePass.status === 'approved' && (
                  <div className="py-4 flex justify-center">
                    <div className="p-3 bg-white rounded-xl shadow-inner border">
                      <QRCodeSVG value={`GATE_PASS:${gatePass.id}:${token}`} size={160} level="M" />
                    </div>
                  </div>
                )}

                {isRejected && gatePass.rejection_reason && (
                  <div className="bg-destructive/5 text-destructive text-sm p-3 rounded-lg border border-destructive/20 text-start">
                    <span className="font-bold block">{isRTL ? "سبب الرفض:" : "Reason:"}</span>
                    {gatePass.rejection_reason}
                  </div>
                )}
              </div>

              {/* Timeline Visualization */}
              <div className="bg-muted/30 p-6 border-t">
                <div className="relative">
                  {/* Vertical Line for Mobile / Horizontal for Desktop? Let's do Vertical for mobile-first */}
                  <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" dir="ltr"></div>

                  <div className="space-y-6 relative" dir="ltr">
                    {TIMELINE_STEPS.map((step, idx) => {
                      const stepNum = idx + 1;
                      const isCompleted = currentTimelineStep > stepNum;
                      const isCurrent = currentTimelineStep === stepNum;
                      const isError = isRejected && stepNum === currentTimelineStep;

                      return (
                        <div key={step.id} className="flex gap-4 items-start pl-0.5">
                          <div className={cn(
                            "z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors shrink-0",
                            isError ? "bg-destructive border-destructive text-white" :
                              (isCompleted || isCurrent) ? "bg-primary border-primary text-white" : "bg-background border-muted text-muted-foreground"
                          )}>
                            {isError ? <XCircle className="h-4 w-4" /> :
                              (isCompleted ? <Check className="h-4 w-4" /> : <step.icon className="h-4 w-4" />)}
                          </div>
                          <div className="pt-1.5 flex flex-col items-start w-full">
                            <span className={cn(
                              "text-sm font-semibold leading-none",
                              isCurrent ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {isRTL ? step.labelAr : step.label}
                            </span>
                            {isCurrent && (
                              <span className="text-xs text-primary mt-1 animate-pulse">
                                {isRTL ? "جاري الآن..." : "In Progress..."}
                              </span>
                            )}
                            {/* Show date if available for specific steps? (Optional enhancement) */}
                          </div>
                          {/* If RTL map flip might be needed visually or just force ltr for timeline structure */}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Details Tabs/Section */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {isRTL ? "تفاصيل التصريح" : "Gate Pass Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">

              {/* Requester Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">{isRTL ? "مقدم الطلب" : "Requester"}</span>
                  <span className="font-medium block">{gatePass.requester_name}</span>
                  <span className="text-xs text-muted-foreground" dir="ltr">{gatePass.requester_phone}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">{isRTL ? "الشركة" : "Company"}</span>
                  <span className="font-medium block">{gatePass.requester_company || "-"}</span>
                </div>
              </div>

              <Separator />

              {/* Vehicle Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  {isRTL ? "المركبة والسائق" : "Vehicle & Driver"}
                </h4>
                <div className="bg-muted/50 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{isRTL ? "لوحة المركبة" : "Plate Number"}</p>
                    <p className="font-mono font-bold text-lg">
                      {gatePass.vehicle_plate_letters} {gatePass.vehicle_plate_numbers}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-xs text-muted-foreground">{isRTL ? "السائق" : "Driver"}</p>
                    <p className="font-medium text-sm">{gatePass.driver_name || "-"}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Schedule */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {isRTL ? "الجدول الزمني" : "Schedule"}
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 border rounded-md text-center">
                    <span className="block text-xs text-muted-foreground mb-1">{isRTL ? "البدء" : "Start"}</span>
                    <span className="font-medium">{format(new Date(gatePass.start_date), "dd/MM/yyyy")}</span>
                  </div>
                  <div className="p-2 border rounded-md text-center">
                    <span className="block text-xs text-muted-foreground mb-1">{isRTL ? "الانتهاء" : "End"}</span>
                    <span className="font-medium">{format(new Date(gatePass.end_date || gatePass.start_date), "dd/MM/yyyy")}</span>
                  </div>
                </div>
                <Badge variant="outline" className="w-full justify-center">
                  {gatePass.pass_type === "in_out" ? (isRTL ? "دخول وخروج" : "Entry & Exit") :
                    gatePass.pass_type === "in" ? (isRTL ? "دخول فقط" : "Entry Only") : (isRTL ? "خروج فقط" : "Exit Only")}
                </Badge>
              </div>

              <Separator />

              {/* Items */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  {isRTL ? "المواد" : "Items"} <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{gatePass.items?.length || 0}</Badge>
                </h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {gatePass.items?.map((item: any) => (
                    <div key={item.id} className="flex gap-3 p-2 border rounded-lg hover:bg-muted/20 transition-colors">
                      <div className="h-12 w-12 rounded overflow-hidden bg-muted shrink-0">
                        {item.photo_storage_path ? (
                          <img
                            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/public-gate-pass-photos/${item.photo_storage_path}`}
                            alt={item.item_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 py-0.5">
                        <p className="text-sm font-medium truncate">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} {item.unit} {item.sr_number ? `• SN: ${item.sr_number}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Branch / Location */}
          {branch && (
            <Card>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{branch.name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{branch.address}</p>
                  </div>
                </div>
                {mapsUrl && (
                  <Button size="icon" variant="ghost" asChild className="shrink-0 h-9 w-9">
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 pt-4">
          {!isRejected && !isCompleted && (
            <Button variant="outline" className="flex-1" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 me-2" />
              {isRTL ? "تحديث" : "Refresh"}
            </Button>
          )}
          {gatePass.status === 'approved' && (
            <Button className="flex-1" asChild>
              <a
                href={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-public-gate-pass-pdf?token=${token}&tenant=${tenantSlug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4 me-2" />
                PDF
              </a>
            </Button>
          )}
        </div>

        <div className="text-center pb-8">
          <Link to={`/${tenantSlug}/request`}>
            <Button variant="link" size="sm" className="text-muted-foreground">
              {isRTL ? "بدء طلب جديد" : "Start a New Request"}
            </Button>
          </Link>
        </div>

      </div>
    </div>
  );
}
