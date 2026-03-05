import React from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QRCodeSVG } from "qrcode.react";
import {
  Building2,
  Clock,
  LogIn,
  Package,
  Truck,
  User,
} from "lucide-react";
import { MaterialGatePass } from "@/features/contractors/hooks/use-material-gate-passes";
import {
  useGatePassDetails,
  GatePassItem,
  GatePassApproverProfile,
} from "@/features/contractors/hooks/use-gate-pass-details";

// Details Tab Component
export function DetailsTab({
  pass,
  passDetails,
  items,
  isLoading,
  getStatusBadge,
  t,
}: {
  pass: MaterialGatePass;
  passDetails: ReturnType<typeof useGatePassDetails>["data"];
  items: GatePassItem[];
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

      {/* Assigned Gate Display */}
      {passDetails?.security_approval_notes?.match(/\[Gate: (.*?)\]/)?.[1] && (
        <div className="p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2 mb-1">
            <LogIn className="h-3.5 w-3.5" />
            {t("security.materialPass.assignedGate", "Assigned Gate / Zone")}
          </h4>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
            {passDetails.security_approval_notes.match(/\[Gate: (.*?)\]/)?.[1]}
          </p>
        </div>
      )}

      {/* Material Description */}
      <div className="p-4 rounded-lg border space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Package className="h-4 w-4" />
          {t("contractors.gatePassDetail.materialDescription", "Material Description")}
        </h4>
        <p className="text-sm font-medium mt-1">
          {data.material_description ||
            (items && items.length > 0
              ? `${items[0].item_name}${items.length > 1 ? ` + ${items.length - 1} more` : ''}`
              : t("contractors.gatePasses.noDescription", "No material description provided"))}
        </p>
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
                : data.is_public_request
                  ? t("contractors.gatePasses.publicRequest", "Public Request")
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

          {/* Expiry Countdown */}
          <div className="pt-2 border-t mt-1">
            {(() => {
              const expiryDate = new Date(data.end_date || data.pass_date);
              // Set to end of day to be generous if no time specified, or parse time window if needed. 
              // For now, assuming end of the passed date.
              expiryDate.setHours(23, 59, 59, 999);

              const now = new Date();
              const isExpired = now > expiryDate;

              // Calculate remaining
              const diffTime = Math.abs(expiryDate.getTime() - now.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              // using ceil for days to match common strictness, or calculate exact d/h

              // More precise calc using date-fns logic manually or if imported
              const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

              if (isExpired) {
                return (
                  <div className="flex items-center gap-1.5 text-destructive text-xs font-semibold">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                    </span>
                    {t("common.expired", "Expired")}
                  </div>
                );
              }

              return (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">
                    {t("common.remainingTime", "Remaining Time")}
                  </span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {days}d {hours}h
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Vehicle & Driver Info */}
      {
        (data.vehicle_plate || data.driver_name) && (
          <div className="p-4 rounded-lg border space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4" />
              {t("contractors.gatePassDetail.vehicleInfo", "Vehicle & Driver")}
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t("contractors.gatePassDetail.plateNumber", "Plate")}:</span>
                <span className="ms-2 font-medium font-mono">
                  {data.is_public_request && (data as any).vehicle_plate_letters && (data as any).vehicle_plate_numbers
                    ? `${(data as any).vehicle_plate_letters} ${(data as any).vehicle_plate_numbers}`
                    : data.vehicle_plate || "-"}
                </span>
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
        )
      }

      {/* Requester Info */}
      <div className="p-4 rounded-lg border space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <User className="h-4 w-4" />
          {t("contractors.gatePasses.requestedBy", "Requested By")}
        </h4>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
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
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {data.is_public_request
                  ? (data.public_requester_name || t("common.publicUser", "Public User"))
                  : ((passDetails?.requester as GatePassApproverProfile)?.full_name || data.requester?.full_name || "-")}
              </span>
              {!data.is_public_request && (passDetails?.requester as any)?.email && (
                <span className="text-xs text-muted-foreground">{(passDetails?.requester as any).email}</span>
              )}
            </div>
          </div>

          {/* Additional Public Requester Info - Using consistent grid layout */}
          {data.is_public_request && (
            <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
              <div>
                <span className="text-muted-foreground">{t("common.phone", "Phone")}:</span>
                <span className="ms-2 font-medium font-mono" dir="ltr">{data.public_requester_phone || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("common.company", "Company")}:</span>
                <span className="ms-2 font-medium">{data.public_requester_company || "-"}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div >
  );
}

