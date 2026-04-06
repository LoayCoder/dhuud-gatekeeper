import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Eye,
  AlertTriangle,
  MapPin,
  Calendar,
  Building,
  ClipboardList,
  Search,
  Clock,
  FileText,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ContractorIncidentDetailDialogProps {
  incidentId: string | null;
  companyId: string;
  onClose: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  level_1: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  level_2: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  level_3: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  level_4: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  level_5: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function severityLabel(sev: string): string {
  const map: Record<string, string> = {
    level_1: "L1",
    level_2: "L2",
    level_3: "L3",
    level_4: "L4",
    level_5: "L5",
  };
  return map[sev] || sev;
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd MMM yyyy");
  } catch {
    return d;
  }
}

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  const isTerminal = ["closed", "verified", "investigation_closed"].includes(status);
  return (
    <Badge variant={isTerminal ? "default" : "outline"} className={isTerminal ? "bg-green-600" : ""}>
      {label}
    </Badge>
  );
}

export default function ContractorIncidentDetailDialog({
  incidentId,
  companyId,
  onClose,
}: ContractorIncidentDetailDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  // Fetch incident — double-gated by companyId
  const { data: incident, isLoading: incidentLoading } = useQuery({
    queryKey: ["contractor-incident-detail", incidentId, companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select(
          "id, title, reference_id, event_type, subtype, incident_type, description, occurred_at, status, severity_v2, location, media_attachments, immediate_actions, has_injury, injury_classification, has_damage"
        )
        .eq("id", incidentId!)
        .eq("related_contractor_company_id", companyId)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) {
        console.error("[ContractorIncidentDetail] Fetch error:", error);
        return null;
      }
      return data;
    },
    enabled: !!incidentId && !!companyId,
  });

  // Fetch branch/site separately to avoid deep type instantiation
  const { data: branchSite } = useQuery({
    queryKey: ["contractor-incident-branch", incidentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("incidents")
        .select("branch_id, site_id")
        .eq("id", incidentId!)
        .maybeSingle();
      if (!data) return null;
      let branchName: string | null = null;
      let siteName: string | null = null;
      if (data.branch_id) {
        const { data: b } = await supabase.from("branches").select("name").eq("id", data.branch_id).maybeSingle();
        branchName = b?.name || null;
      }
      if (data.site_id) {
        const { data: s } = await supabase.from("sites").select("name").eq("id", data.site_id).maybeSingle();
        siteName = s?.name || null;
      }
      return { branchName, siteName };
    },
    enabled: !!incidentId && !!companyId,
  });

  // Fetch investigation summary
  const { data: investigation } = useQuery({
    queryKey: ["contractor-investigation-detail", incidentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investigations")
        .select(
          "id, findings_summary, immediate_cause, root_cause, contributing_factors, started_at, completed_at, investigator:profiles!investigations_investigator_id_fkey(full_name)"
        )
        .eq("incident_id", incidentId!)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) {
        console.warn("[ContractorIncidentDetail] Investigation fetch:", error);
        return null;
      }
      return data;
    },
    enabled: !!incidentId && !!companyId,
  });

  // Fetch RCA
  const { data: rca } = useQuery({
    queryKey: ["contractor-rca-detail", incidentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incident_rca")
        .select("immediate_causes, root_causes, underlying_causes")
        .eq("incident_id", incidentId!)
        .maybeSingle();
      if (error) {
        console.warn("[ContractorIncidentDetail] RCA fetch:", error);
        return null;
      }
      return data;
    },
    enabled: !!incidentId && !!companyId,
  });

  // Fetch corrective actions
  const { data: actions } = useQuery({
    queryKey: ["contractor-actions-detail", incidentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("corrective_actions")
        .select(
          "id, title, status, due_date, assigned_user:profiles!corrective_actions_assigned_to_fkey(full_name)"
        )
        .eq("incident_id", incidentId!)
        .is("deleted_at", null)
        .order("due_date", { ascending: true });
      if (error) {
        console.warn("[ContractorIncidentDetail] Actions fetch:", error);
        return null;
      }
      return data;
    },
    enabled: !!incidentId && !!companyId,
  });

  const isOpen = !!incidentId;
  const isEventTypeObservation = incident?.event_type === "observation";
  const eventIcon = isEventTypeObservation ? (
    <Eye className="h-5 w-5" />
  ) : (
    <AlertTriangle className="h-5 w-5" />
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-3xl max-h-[85vh] p-0 gap-0 overflow-hidden"
        dir={direction}
      >
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-start">
            {eventIcon}
            <span className="truncate">
              {incidentLoading
                ? t("common.loading", "Loading...")
                : incident?.title || t("contractorPortal.hsse.modal.notFound", "Not found")}
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="px-6 pb-6 max-h-[calc(85vh-80px)]">
          {incidentLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : !incident ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Info className="h-10 w-10 mb-3" />
              <p>{t("contractorPortal.hsse.modal.noAccess", "You don't have access to this record")}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overview Section */}
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t("contractorPortal.hsse.modal.overview", "Overview")}
                </h3>
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    {/* Type & Severity badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {incident.event_type === "observation"
                          ? t("contractorPortal.hsse.observations", "Observation")
                          : t("contractorPortal.hsse.incidents", "Incident")}
                      </Badge>
                      {incident.subtype && (
                        <Badge variant="secondary">{incident.subtype.replace(/_/g, " ")}</Badge>
                      )}
                      {incident.severity_v2 && (
                        <Badge className={SEVERITY_COLORS[incident.severity_v2] || ""} variant="outline">
                          {severityLabel(incident.severity_v2)}
                        </Badge>
                      )}
                      <StatusBadge status={incident.status} />
                    </div>

                    {/* Metadata grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>{formatDate(incident.occurred_at)}</span>
                      </div>
                      {incident.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="truncate">{incident.location}</span>
                        </div>
                      )}
                      {branchSite?.branchName && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building className="h-4 w-4 shrink-0" />
                          <span>
                            {branchSite.branchName}
                            {branchSite.siteName && ` · ${branchSite.siteName}`}
                          </span>
                        </div>
                      )}
                      {incident.reference_id && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="font-mono text-xs">{incident.reference_id}</span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {incident.description && (
                      <>
                        <Separator />
                        <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
                      </>
                    )}

                    {/* Immediate actions */}
                    {incident.immediate_actions && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {t("contractorPortal.hsse.modal.immediateActions", "Immediate Actions Taken")}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{incident.immediate_actions}</p>
                        </div>
                      </>
                    )}

                    {/* Injury / Damage flags */}
                    <div className="flex flex-wrap gap-2">
                      {incident.has_injury && (
                        <Badge variant="destructive">
                          {t("contractorPortal.hsse.modal.injuryReported", "Injury Reported")}
                          {incident.injury_classification && ` (${incident.injury_classification})`}
                        </Badge>
                      )}
                      {incident.has_damage && (
                        <Badge variant="destructive">
                          {t("contractorPortal.hsse.modal.damageReported", "Damage Reported")}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Investigation Section */}
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  {t("contractorPortal.hsse.modal.investigation", "Investigation")}
                </h3>
                {!investigation && !rca ? (
                  <Card>
                    <CardContent className="py-6 text-center text-muted-foreground text-sm">
                      {t("contractorPortal.hsse.modal.noInvestigation", "Investigation details are not available yet")}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-4 space-y-3 text-sm">
                      {investigation?.findings_summary && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {t("contractorPortal.hsse.modal.findings", "Findings Summary")}
                          </p>
                          <p className="whitespace-pre-wrap">{investigation.findings_summary}</p>
                        </div>
                      )}

                      {investigation?.immediate_cause && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {t("contractorPortal.hsse.modal.immediateCause", "Immediate Cause")}
                          </p>
                          <p className="whitespace-pre-wrap">{investigation.immediate_cause}</p>
                        </div>
                      )}

                      {investigation?.root_cause && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {t("contractorPortal.hsse.modal.rootCause", "Root Cause")}
                          </p>
                          <p className="whitespace-pre-wrap">{investigation.root_cause}</p>
                        </div>
                      )}

                      {investigation?.contributing_factors && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {t("contractorPortal.hsse.modal.contributingFactors", "Contributing Factors")}
                          </p>
                          <p className="whitespace-pre-wrap">{investigation.contributing_factors}</p>
                        </div>
                      )}

                      {/* RCA details if available */}
                      {rca?.immediate_causes && (rca.immediate_causes as string[]).length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {t("contractorPortal.hsse.modal.rcaImmediateCauses", "RCA - Immediate Causes")}
                          </p>
                          <ul className="list-disc ps-5 space-y-1">
                            {(rca.immediate_causes as string[]).map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Investigation metadata */}
                      <Separator />
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {(investigation as any)?.investigator?.full_name && (
                          <span>
                            {t("contractorPortal.hsse.modal.investigator", "Investigator")}: {(investigation as any).investigator.full_name}
                          </span>
                        )}
                        {investigation?.started_at && (
                          <span>
                            {t("contractorPortal.hsse.modal.started", "Started")}: {formatDate(investigation.started_at)}
                          </span>
                        )}
                        {investigation?.completed_at && (
                          <span>
                            {t("contractorPortal.hsse.modal.completed", "Completed")}: {formatDate(investigation.completed_at)}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </section>

              {/* Corrective Actions Section */}
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  {t("contractorPortal.hsse.modal.correctiveActions", "Corrective Actions")}
                </h3>
                {!actions || actions.length === 0 ? (
                  <Card>
                    <CardContent className="py-6 text-center text-muted-foreground text-sm">
                      {t("contractorPortal.hsse.modal.noActions", "No corrective actions assigned")}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {actions.map((action) => {
                      const isOverdue =
                        action.due_date &&
                        action.due_date < new Date().toISOString() &&
                        !["closed", "verified"].includes(action.status);
                      return (
                        <Card
                          key={action.id}
                          className={isOverdue ? "border-destructive/50 bg-destructive/5" : ""}
                        >
                          <CardContent className="py-3 px-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{action.title}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatDate(action.due_date)}</span>
                                  {(action.assigned_user as any)?.full_name && (
                                    <>
                                      <span>·</span>
                                      <span>{(action.assigned_user as any).full_name}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {isOverdue && (
                                  <Badge variant="destructive" className="text-xs">
                                    {t("contractorPortal.hsse.overdue", "overdue")}
                                  </Badge>
                                )}
                                <StatusBadge status={action.status} />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
