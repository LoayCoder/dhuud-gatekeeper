import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Video, Clock, Users, Send, AlertCircle, Globe, Languages, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ContractorWorker } from "@/hooks/contractor-management/use-contractor-workers";
import { useContractorProjects } from "@/hooks/contractor-management/use-contractor-projects";
import { resolveWorkerLanguage } from "@/lib/language-resolver";

interface WorkerBulkInductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workers: ContractorWorker[];
}

export function WorkerBulkInductionDialog({
  open,
  onOpenChange,
  workers,
}: WorkerBulkInductionDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  // Get projects for the first worker's company or all projects
  const companyIds = useMemo(
    () => [...new Set(workers.map((w) => w.company_id))],
    [workers]
  );
  
  const { data: allProjects = [] } = useContractorProjects({ status: "active" });
  
  // Filter projects by companies of selected workers
  const projects = useMemo(() => {
    if (companyIds.length === 1) {
      return allProjects.filter((p) => p.company_id === companyIds[0]);
    }
    // If workers from multiple companies, show all projects
    return allProjects;
  }, [allProjects, companyIds]);

  // Filter workers with valid mobile numbers and approved status
  const eligibleWorkers = useMemo(
    () =>
      workers.filter(
        (w) =>
          w.mobile_number &&
          w.mobile_number.trim() !== "" &&
          w.approval_status === "approved"
      ),
    [workers]
  );

  // Calculate estimated time (30 seconds per message)
  const estimatedMinutes = useMemo(
    () => Math.ceil((eligibleWorkers.length * 30) / 60),
    [eligibleWorkers.length]
  );

  // Group workers by language for summary
  const languageGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    eligibleWorkers.forEach(worker => {
      const lang = getWorkerLanguage(worker);
      groups[lang] = (groups[lang] || 0) + 1;
    });
    return groups;
  }, [eligibleWorkers]);

  const handleSendInductions = async () => {
    if (!selectedProjectId || eligibleWorkers.length === 0) return;

    setIsSending(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-bulk-induction", {
        body: {
          worker_ids: eligibleWorkers.map((w) => w.id),
          project_id: selectedProjectId,
          tenant_id: tenantId,
        },
      });

      if (error) throw error;

      toast({
        title: t("contractors.workers.inductionSent", "Inductions sent successfully"),
        description: t(
          "contractors.workers.messageDelay",
          "Messages will be sent with a 30-second delay between each"
        ),
      });

      setSelectedProjectId("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to send bulk inductions:", error);
      toast({
        variant: "destructive",
        title: t("contractors.workers.inductionFailed", "Failed to send inductions"),
        description: error.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get worker's language - use preferred_language if set (and not 'en'), otherwise resolve from nationality
  const getWorkerLanguage = (worker: ContractorWorker): string => {
    if (worker.preferred_language && worker.preferred_language !== 'en') {
      return worker.preferred_language.toUpperCase();
    }
    return resolveWorkerLanguage(worker.nationality).toUpperCase();
  };

  // Format estimated time for display
  const formatEstimatedTime = (workerCount: number): string => {
    const totalSeconds = workerCount * 30;
    if (totalSeconds < 60) {
      return `${totalSeconds} ${t("common.seconds", "seconds")}`;
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (seconds === 0) {
      return `${minutes} ${t("common.minutes", "minutes")}`;
    }
    return `${minutes} ${t("common.minutes", "minutes")} ${seconds} ${t("common.seconds", "seconds")}`;
  };

  const pendingCount = workers.filter((w) => w.approval_status !== "approved").length;
  const noMobileCount = workers.filter(
    (w) => !w.mobile_number || w.mobile_number.trim() === ""
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            {t("contractors.workers.bulkInductionTitle", "Send Bulk Induction")}
          </DialogTitle>
          <DialogDescription>
            {t("contractors.workers.bulkInductionDesc", "Send safety induction video to multiple workers via WhatsApp")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Project selection */}
          <div>
            <Label htmlFor="project">
              {t("contractors.workers.selectProject", "Select Project For Induction")}
            </Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="mt-1">
                <SelectValue
                  placeholder={t("contractors.projects.selectProject", "Select Project")}
                />
              </SelectTrigger>
              <SelectContent>
                {projects.length === 0 ? (
                  <SelectItem value="no-projects" disabled>
                    {t("contractors.projects.noProjects", "No Projects")}
                  </SelectItem>
                ) : (
                  projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.project_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Recipients preview */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4" />
              {t("contractors.workers.eligibleWorkers", "Eligible Workers")} ({eligibleWorkers.length})
            </Label>
            <ScrollArea className="h-40 border rounded-md p-2">
              <div className="space-y-2">
                {eligibleWorkers.map((worker) => (
                  <div key={worker.id} className="flex items-center gap-2 text-sm">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={worker.photo_path || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(worker.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{worker.full_name}</span>
                    <Badge variant="outline" className="text-xs">
                      <Globe className="h-3 w-3 me-1" />
                      {getWorkerLanguage(worker)}
                    </Badge>
                    <span className="text-muted-foreground text-xs">{worker.mobile_number}</span>
                  </div>
                ))}
                {(pendingCount > 0 || noMobileCount > 0) && (
                  <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
                    {pendingCount > 0 && (
                      <div>{pendingCount} worker(s) skipped (not approved)</div>
                    )}
                    {noMobileCount > 0 && (
                      <div>{noMobileCount} worker(s) skipped (no mobile number)</div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Language Breakdown */}
          {Object.keys(languageGroups).length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                {t("contractors.workers.languageBreakdown", "Language Breakdown")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(languageGroups).map(([lang, count]) => (
                  <Badge key={lang} variant="secondary" className="text-xs">
                    {lang}: {count}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("contractors.workers.languageBreakdownDesc", 
                  "Each worker will receive the induction message in their assigned language")}
              </p>
            </div>
          )}

          {/* Delay warning */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription className="flex flex-col gap-1">
              <span className="font-medium">
                {t("contractors.workers.messageDelayTitle", "Message Delay")}
              </span>
              <span>
                {t(
                  "contractors.workers.messageDelay",
                  "Messages will be sent with a 30-second delay between each"
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("contractors.workers.estimatedTime", "Estimated time: {{time}}", {
                  time: formatEstimatedTime(eligibleWorkers.length),
                })}
              </span>
            </AlertDescription>
          </Alert>

          {/* Template notice */}
          <Alert variant="default" className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {t("contractors.workers.templateNotice", 
                "Messages use notification templates. Create templates in WhatsApp Templates for each language (e.g., induction_video_ar, induction_video_en).")}
            </AlertDescription>
          </Alert>

          {eligibleWorkers.length === 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t(
                  "contractors.workers.noEligibleWorkers",
                  "No eligible workers. Workers must be approved and have a mobile number."
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSendInductions}
            disabled={!selectedProjectId || eligibleWorkers.length === 0 || isSending}
          >
            {isSending ? (
              <>
                <Clock className="h-4 w-4 me-1 animate-spin" />
                {t("contractors.workers.sending", "Sending...")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 me-1" />
                {t("contractors.workers.sendInduction", "Send Induction")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
