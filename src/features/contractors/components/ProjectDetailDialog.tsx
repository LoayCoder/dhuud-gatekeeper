import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  MapPin,
  Users,
  ShieldCheck,
  Building2,
  User,
  Hash,
  FileText,
  Globe,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import type { ContractorPortalProject } from "@/features/contractors/hooks/use-contractor-portal";

interface ProjectDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ContractorPortalProject | null;
}

export function ProjectDetailDialog({
  open,
  onOpenChange,
  project,
}: ProjectDetailDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  if (!project) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-success text-success-foreground">
            {t("common.active", "Active")}
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="secondary">
            {t("common.completed", "Completed")}
          </Badge>
        );
      case "on_hold":
        return (
          <Badge variant="outline" className="text-warning border-warning">
            {t("common.onHold", "On Hold")}
          </Badge>
        );
      case "planned":
        return (
          <Badge variant="outline" className="text-info border-info">
            {t("contractors.projectStatus.planned", "Planned")}
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive">
            {t("contractors.projectStatus.cancelled", "Cancelled")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const displayName =
    direction === "rtl" && project.project_name_ar
      ? project.project_name_ar
      : project.project_name;

  const DetailRow = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
  }) =>
    value ? (
      <div className="flex items-start gap-3 py-2">
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium break-words">{value}</p>
        </div>
      </div>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[85vh] overflow-y-auto"
        dir={direction}
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-xl break-words">
                {displayName}
              </DialogTitle>
              <p className="text-sm text-muted-foreground font-mono mt-1">
                {project.project_code}
              </p>
            </div>
            {getStatusBadge(project.status)}
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("contractorPortal.projects.timeline", "Timeline")}
          </h3>
          <DetailRow
            icon={Calendar}
            label={t("contractors.projects.startDate", "Start Date")}
            value={format(new Date(project.start_date), "PPP")}
          />
          <DetailRow
            icon={Calendar}
            label={t("contractors.projects.endDate", "End Date")}
            value={
              project.end_date
                ? format(new Date(project.end_date), "PPP")
                : t("common.ongoing", "Ongoing")
            }
          />
        </div>

        <Separator />

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("contractorPortal.projects.location", "Location & Organization")}
          </h3>
          <DetailRow
            icon={Building2}
            label={t("common.branch", "Branch")}
            value={project.branch?.name}
          />
          <DetailRow
            icon={MapPin}
            label={t("common.site", "Site")}
            value={project.site?.name}
          />
          <DetailRow
            icon={Layers}
            label={t("common.department", "Department")}
            value={project.department?.name}
          />
          <DetailRow
            icon={MapPin}
            label={t(
              "contractors.projects.locationDescription",
              "Location Description"
            )}
            value={project.location_description}
          />
          {project.geofence_radius_meters != null && (
            <DetailRow
              icon={Globe}
              label={t(
                "contractors.projects.geofenceRadius",
                "Geofence Radius"
              )}
              value={`${project.geofence_radius_meters} m`}
            />
          )}
        </div>

        <Separator />

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("contractorPortal.projects.team", "Team")}
          </h3>
          <DetailRow
            icon={User}
            label={t("contractors.projects.projectManager", "Project Manager")}
            value={project.project_manager?.full_name}
          />
          <DetailRow
            icon={Users}
            label={t("contractors.projects.assignedWorkers", "Assigned Workers")}
            value={String(project.assigned_workers_count)}
          />
          {project.required_safety_officers != null && (
            <DetailRow
              icon={ShieldCheck}
              label={t(
                "contractors.projects.requiredSafetyOfficers",
                "Required Safety Officers"
              )}
              value={String(project.required_safety_officers)}
            />
          )}
        </div>

        {project.notes && (
          <>
            <Separator />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t("common.notes", "Notes")}
              </h3>
              <div className="flex items-start gap-3 py-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm whitespace-pre-wrap">{project.notes}</p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
