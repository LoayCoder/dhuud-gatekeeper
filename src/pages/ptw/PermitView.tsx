import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Calendar, 
  User, 
  Building2, 
  Phone, 
  FileText,
  QrCode,
  Flame,
  Construction,
  Radiation,
  Shovel,
  Zap,
  Shield,
  FileWarning,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { usePTWPermit, useUpdatePermitStatus } from "@/hooks/ptw";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";

const permitTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  hot_work: Flame,
  lifting: Construction,
  radiography: Radiation,
  excavation: Shovel,
  confined_space: Shield,
  electrical: Zap,
  general: FileWarning,
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  requested: "bg-amber-500",
  endorsed: "bg-blue-500",
  issued: "bg-green-500",
  active: "bg-green-600",
  suspended: "bg-red-500",
  closed: "bg-gray-600",
  cancelled: "bg-red-600",
};

export default function PermitView() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: permit, isLoading } = usePTWPermit(id);
  const updateStatus = useUpdatePermitStatus();

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!permit) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("ptw.view.notFound", "Permit not found")}</p>
      </div>
    );
  }

  const IconComponent = permitTypeIcons[permit.permit_type?.code || "general"] || FileWarning;
  const canApprove = ["requested", "endorsed"].includes(permit.status);
  const canActivate = permit.status === "issued";
  const canClose = permit.status === "active";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-muted">
            <IconComponent className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{permit.reference_id}</h1>
              <Badge className={statusColors[permit.status]}>
                {permit.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {permit.permit_type?.name} • {permit.project?.name}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {canApprove && (
            <>
              <Button
                variant="outline"
                onClick={() => updateStatus.mutate({ 
                  permitId: permit.id, 
                  status: permit.status === "requested" ? "endorsed" : "issued" 
                })}
                disabled={updateStatus.isPending}
              >
                <CheckCircle2 className="me-2 h-4 w-4" />
                {permit.status === "requested" 
                  ? t("ptw.view.endorse", "Endorse") 
                  : t("ptw.view.issue", "Issue")
                }
              </Button>
              <Button
                variant="destructive"
                onClick={() => updateStatus.mutate({ permitId: permit.id, status: "cancelled" })}
                disabled={updateStatus.isPending}
              >
                <XCircle className="me-2 h-4 w-4" />
                {t("ptw.view.reject", "Reject")}
              </Button>
            </>
          )}
          {canActivate && (
            <Button
              onClick={() => updateStatus.mutate({ permitId: permit.id, status: "active" })}
              disabled={updateStatus.isPending}
            >
              <CheckCircle2 className="me-2 h-4 w-4" />
              {t("ptw.view.activate", "Start Work")}
            </Button>
          )}
          {canClose && (
            <Button
              variant="outline"
              onClick={() => updateStatus.mutate({ permitId: permit.id, status: "closed" })}
              disabled={updateStatus.isPending}
            >
              <Clock className="me-2 h-4 w-4" />
              {t("ptw.view.close", "Close Permit")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Work Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("ptw.view.workDescription", "Work Description")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{permit.job_description || "-"}</p>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t("ptw.view.location", "Location")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">{t("ptw.view.site", "Site")}</p>
                  <p className="font-medium">{permit.site?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("ptw.view.details", "Details")}</p>
                  <p className="font-medium">{permit.location_details || "-"}</p>
                </div>
              </div>
              {permit.gps_lat && permit.gps_lng && (
                <div className="text-sm text-muted-foreground">
                  GPS: {permit.gps_lat.toFixed(6)}, {permit.gps_lng.toFixed(6)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t("ptw.view.timeline", "Timeline")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">{t("ptw.view.plannedStart", "Planned Start")}</p>
                  <p className="font-medium">
                    {format(new Date(permit.planned_start_time), "PPp")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("ptw.view.plannedEnd", "Planned End")}</p>
                  <p className="font-medium">
                    {format(new Date(permit.planned_end_time), "PPp")}
                  </p>
                </div>
                {permit.actual_start_time && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t("ptw.view.actualStart", "Actual Start")}</p>
                    <p className="font-medium">
                      {format(new Date(permit.actual_start_time), "PPp")}
                    </p>
                  </div>
                )}
                {permit.actual_end_time && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t("ptw.view.actualEnd", "Actual End")}</p>
                    <p className="font-medium">
                      {format(new Date(permit.actual_end_time), "PPp")}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* QR Code */}
          {["issued", "active"].includes(permit.status) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  {t("ptw.view.qrCode", "QR Code")}
                </CardTitle>
                <CardDescription>
                  {t("ptw.view.qrCodeDesc", "Scan for verification")}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <QRCodeSVG 
                  value={`PTW:${permit.id}:${permit.reference_id}`}
                  size={160}
                  level="M"
                />
              </CardContent>
            </Card>
          )}

          {/* Personnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("ptw.view.personnel", "Personnel")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">{t("ptw.view.applicant", "Applicant")}</p>
                <p className="font-medium">{permit.applicant?.full_name || "-"}</p>
              </div>
              {permit.issuer && (
                <div>
                  <p className="text-sm text-muted-foreground">{t("ptw.view.issuer", "Issuer")}</p>
                  <p className="font-medium">{permit.issuer.full_name}</p>
                </div>
              )}
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">{t("ptw.view.emergency", "Emergency Contact")}</p>
                <p className="font-medium">{permit.emergency_contact_name || "-"}</p>
                {permit.emergency_contact_number && (
                  <p className="text-sm flex items-center gap-1 mt-1">
                    <Phone className="h-3 w-3" />
                    {permit.emergency_contact_number}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SIMOPS Status */}
          <Card>
            <CardHeader>
              <CardTitle>{t("ptw.view.simops", "SIMOPS Status")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge 
                variant={
                  permit.simops_status === "clear" ? "default" :
                  permit.simops_status === "warning" ? "secondary" :
                  "destructive"
                }
              >
                {permit.simops_status}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
