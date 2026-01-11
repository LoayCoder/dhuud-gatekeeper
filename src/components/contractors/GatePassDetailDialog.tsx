import { useTranslation } from "react-i18next";
import { format, formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeSVG } from "qrcode.react";
import {
  FileText,
  Truck,
  Clock,
  Building2,
  User,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  Package,
  ImageIcon,
} from "lucide-react";
import { MaterialGatePass } from "@/hooks/contractor-management/use-material-gate-passes";
import {
  useGatePassDetails,
  useGatePassItems,
  useGatePassPhotos,
  GatePassApproverProfile,
} from "@/hooks/contractor-management/use-gate-pass-details";
import { cn } from "@/lib/utils";
import { GatePassPDFExportButton } from "./GatePassPDFExportButton";

interface GatePassDetailDialogProps {
  pass: MaterialGatePass | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GatePassDetailDialog({
  pass,
  open,
  onOpenChange,
}: GatePassDetailDialogProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  const { data: passDetails, isLoading: isLoadingDetails } = useGatePassDetails(
    open ? pass?.id || null : null
  );
  const { data: items, isLoading: isLoadingItems } = useGatePassItems(
    open ? pass?.id || null : null
  );
  const { data: photos, isLoading: isLoadingPhotos } = useGatePassPhotos(
    open ? pass?.id || null : null
  );

  if (!pass) return null;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      approved: "default",
      pending_pm_approval: "secondary",
      pending_safety_approval: "secondary",
      rejected: "destructive",
      completed: "outline",
    };
    const labels: Record<string, string> = {
      approved: t("contractors.passStatus.approved", "Approved"),
      pending_pm_approval: t("contractors.passStatus.pendingPm", "Pending PM"),
      pending_safety_approval: t("contractors.passStatus.pendingSafety", "Pending Safety"),
      rejected: t("contractors.passStatus.rejected", "Rejected"),
      completed: t("contractors.passStatus.completed", "Completed"),
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("contractors.gatePassDetail.title", "Gate Pass Details")}
            </DialogTitle>
            {pass?.status === 'approved' && (
              <GatePassPDFExportButton passId={pass.id} />
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">
              {t("contractors.gatePassDetail.detailsTab", "Details")}
            </TabsTrigger>
            <TabsTrigger value="items">
              {t("contractors.gatePassDetail.itemsTab", "Items & Photos")}
            </TabsTrigger>
            <TabsTrigger value="timeline">
              {t("contractors.gatePassDetail.timelineTab", "Timeline")}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="details" className="mt-0 space-y-4">
              <DetailsTab
                pass={pass}
                passDetails={passDetails}
                isLoading={isLoadingDetails}
                getStatusBadge={getStatusBadge}
                t={t}
              />
            </TabsContent>

            <TabsContent value="items" className="mt-0 space-y-4">
              <ItemsPhotosTab
                items={items || []}
                photos={photos || []}
                isLoadingItems={isLoadingItems}
                isLoadingPhotos={isLoadingPhotos}
                t={t}
              />
            </TabsContent>

            <TabsContent value="timeline" className="mt-0">
              <TimelineTab
                passDetails={passDetails}
                isLoading={isLoadingDetails}
                dateLocale={dateLocale}
                isRTL={isRTL}
                t={t}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Details Tab Component
function DetailsTab({
  pass,
  passDetails,
  isLoading,
  getStatusBadge,
  t,
}: {
  pass: MaterialGatePass;
  passDetails: ReturnType<typeof useGatePassDetails>["data"];
  isLoading: boolean;
  getStatusBadge: (status: string) => JSX.Element;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const data = passDetails || pass;

  return (
    <div className="space-y-4 pe-4">
      {/* Header Section */}
      <div className="flex items-start justify-between p-4 rounded-lg border bg-muted/30">
        <div>
          <p className="font-mono text-lg font-semibold">{data.reference_number}</p>
          <div className="flex items-center gap-2 mt-1">
            {getStatusBadge(data.status)}
            <Badge variant="outline">
              {t(`contractors.passType.${data.pass_type}`, data.pass_type)}
            </Badge>
          </div>
        </div>
        {passDetails?.qr_code_token && data.status === "approved" && (
          <div className="bg-white p-2 rounded-lg">
            <QRCodeSVG value={passDetails.qr_code_token} size={80} />
          </div>
        )}
      </div>

      {/* Material Description */}
      <div className="p-4 rounded-lg border space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Package className="h-4 w-4" />
          {t("contractors.gatePassDetail.materialDescription", "Material Description")}
        </h4>
        <p className="text-sm">{data.material_description}</p>
        {data.quantity && (
          <p className="text-sm text-muted-foreground">
            {t("common.quantity", "Quantity")}: {data.quantity}
          </p>
        )}
      </div>

      {/* Project & Date Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {t("contractors.gatePasses.project", "Project")}
          </h4>
          <p className="text-sm">
            {data.project?.project_name || 
              (data.is_internal_request 
                ? t("contractors.gatePasses.internalRequest", "Internal Request")
                : "-")}
          </p>
          {data.project?.company?.company_name && (
            <p className="text-xs text-muted-foreground">{data.project.company.company_name}</p>
          )}
        </div>

        <div className="p-4 rounded-lg border space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t("contractors.gatePasses.passDate", "Date & Time")}
          </h4>
          <p className="text-sm">{format(new Date(data.pass_date), "PPP")}</p>
          {data.time_window_start && data.time_window_end && (
            <p className="text-xs text-muted-foreground">
              {data.time_window_start} - {data.time_window_end}
            </p>
          )}
        </div>
      </div>

      {/* Vehicle & Driver Info */}
      {(data.vehicle_plate || data.driver_name) && (
        <div className="p-4 rounded-lg border space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Truck className="h-4 w-4" />
            {t("contractors.gatePassDetail.vehicleInfo", "Vehicle & Driver")}
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("contractors.gatePassDetail.plateNumber", "Plate")}:</span>
              <span className="ms-2 font-medium">{data.vehicle_plate || "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">{t("contractors.gatePassDetail.driverName", "Driver")}:</span>
              <span className="ms-2 font-medium">{data.driver_name || "-"}</span>
            </div>
            {data.driver_mobile && (
              <div className="col-span-2">
                <span className="text-muted-foreground">{t("contractors.gatePassDetail.driverMobile", "Mobile")}:</span>
                <span className="ms-2 font-medium">{data.driver_mobile}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Requester Info */}
      <div className="p-4 rounded-lg border space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <User className="h-4 w-4" />
          {t("contractors.gatePasses.requestedBy", "Requested By")}
        </h4>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={(passDetails?.requester as GatePassApproverProfile)?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {((passDetails?.requester as GatePassApproverProfile)?.full_name || data.requester?.full_name || "?")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{(passDetails?.requester as GatePassApproverProfile)?.full_name || data.requester?.full_name || "-"}</span>
        </div>
      </div>
    </div>
  );
}

// Items & Photos Tab Component
function ItemsPhotosTab({
  items,
  photos,
  isLoadingItems,
  isLoadingPhotos,
  t,
}: {
  items: ReturnType<typeof useGatePassItems>["data"];
  photos: ReturnType<typeof useGatePassPhotos>["data"];
  isLoadingItems: boolean;
  isLoadingPhotos: boolean;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  return (
    <div className="space-y-6 pe-4">
      {/* Items Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Package className="h-4 w-4" />
          {t("contractors.gatePassDetail.items", "Items")}
        </h4>
        {isLoadingItems ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items && items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{item.item_name}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                  </div>
                  {item.quantity && (
                    <Badge variant="outline" className="text-xs">
                      {item.quantity} {item.unit || ""}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t("contractors.gatePassDetail.noItems", "No items listed")}
          </p>
        )}
      </div>

      {/* Photos Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          {t("contractors.gatePassDetail.photos", "Photos")}
        </h4>
        {isLoadingPhotos ? (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : photos && photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border">
                {photo.signedUrl ? (
                  <img
                    src={photo.signedUrl}
                    alt={photo.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t("contractors.gatePassDetail.noPhotos", "No photos attached")}
          </p>
        )}
      </div>
    </div>
  );
}

// Timeline Tab Component
function TimelineTab({
  passDetails,
  isLoading,
  dateLocale,
  isRTL,
  t,
}: {
  passDetails: ReturnType<typeof useGatePassDetails>["data"];
  isLoading: boolean;
  dateLocale: typeof ar | typeof enUS;
  isRTL: boolean;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  if (isLoading) {
    return (
      <div className="space-y-4 pe-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!passDetails) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{t("contractors.gatePassDetail.noTimeline", "No timeline available")}</p>
      </div>
    );
  }

  // Build timeline events
  const events: TimelineEvent[] = [];

  // 1. Created
  events.push({
    type: "created",
    label: t("contractors.gatePassDetail.timeline.created", "Pass Created"),
    timestamp: passDetails.created_at,
    actor: passDetails.requester as GatePassApproverProfile,
    icon: FileText,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  });

  // 2. PM Approval or Rejection
  if (passDetails.pm_approved_at && passDetails.pm_approver) {
    events.push({
      type: "pm_approved",
      label: t("contractors.gatePassDetail.timeline.pmApproved", "PM Approved"),
      timestamp: passDetails.pm_approved_at,
      actor: passDetails.pm_approver as GatePassApproverProfile,
      notes: passDetails.pm_notes,
      icon: CheckCircle2,
      color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    });
  }

  // 3. Safety Approval
  if (passDetails.safety_approved_at && passDetails.safety_approver) {
    events.push({
      type: "safety_approved",
      label: t("contractors.gatePassDetail.timeline.safetyApproved", "Safety Approved"),
      timestamp: passDetails.safety_approved_at,
      actor: passDetails.safety_approver as GatePassApproverProfile,
      notes: passDetails.safety_notes,
      icon: CheckCircle2,
      color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    });
  }

  // 4. Rejection (if rejected)
  if (passDetails.rejected_at && passDetails.rejector) {
    events.push({
      type: "rejected",
      label: t("contractors.gatePassDetail.timeline.rejected", "Rejected"),
      timestamp: passDetails.rejected_at,
      actor: passDetails.rejector as GatePassApproverProfile,
      notes: passDetails.rejection_reason,
      icon: XCircle,
      color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    });
  }

  // 5. Entry Verified
  if (passDetails.entry_time) {
    events.push({
      type: "entry",
      label: t("contractors.gatePassDetail.timeline.entryVerified", "Entry Verified"),
      timestamp: passDetails.entry_time,
      actor: passDetails.guard as GatePassApproverProfile,
      icon: LogIn,
      color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    });
  }

  // 6. Exit Verified
  if (passDetails.exit_time) {
    events.push({
      type: "exit",
      label: t("contractors.gatePassDetail.timeline.exitVerified", "Exit Verified"),
      timestamp: passDetails.exit_time,
      actor: passDetails.guard as GatePassApproverProfile,
      icon: LogOut,
      color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    });
  }

  // Sort by timestamp
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="relative pe-4">
      {/* Timeline line */}
      <div
        className={cn(
          "absolute top-0 bottom-0 w-0.5 bg-border",
          isRTL ? "end-4" : "start-4"
        )}
      />

      <div className="space-y-4">
        {events.map((event, index) => (
          <TimelineItem
            key={`${event.type}-${index}`}
            event={event}
            isFirst={index === events.length - 1}
            dateLocale={dateLocale}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

interface TimelineEvent {
  type: string;
  label: string;
  timestamp: string;
  actor?: GatePassApproverProfile | null;
  notes?: string | null;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function TimelineItem({
  event,
  isFirst,
  dateLocale,
  t,
}: {
  event: TimelineEvent;
  isFirst: boolean;
  dateLocale: typeof ar | typeof enUS;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const IconComponent = event.icon;
  const actorName = event.actor?.full_name || t("common.system", "System");
  const actorInitials = actorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex gap-3 relative">
      {/* Icon */}
      <div
        className={cn(
          "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background",
          isFirst && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
      >
        <IconComponent className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{event.label}</p>
          <Badge className={cn("text-xs", event.color)}>{event.type.replace("_", " ")}</Badge>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <Avatar className="h-5 w-5">
            <AvatarImage src={event.actor?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px]">
              {event.actor ? actorInitials : <User className="h-3 w-3" />}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{actorName}</span>
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          {format(new Date(event.timestamp), "PPp", { locale: dateLocale })}
          <span className="mx-1">•</span>
          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: dateLocale })}
        </p>

        {event.notes && (
          <p className="text-xs text-muted-foreground/80 mt-1 italic">"{event.notes}"</p>
        )}
      </div>
    </div>
  );
}
