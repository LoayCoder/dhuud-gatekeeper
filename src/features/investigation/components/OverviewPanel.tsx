import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, UserCheck, Play, CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ReporterInfoCard } from "./ReporterInfoCard";
import { IncidentInfoCard } from "./IncidentInfoCard";
import { InvestigatorAssignmentCard } from "./InvestigatorAssignmentCard";
import { SeverityAdjustmentCard } from "./SeverityAdjustmentCard";
import { ApprovalWorkflowBanner } from "./ApprovalWorkflowBanner";
import { LinkedAssetsCard } from "./LinkedAssetsCard";
import { ContractorPersonnelCard } from "./ContractorPersonnelCard";
import { AdminEditObservationDialog } from '@/features/admin';
import { useAuth } from "@/contexts/AuthContext";
import type { IncidentWithDetails } from '@/features/incidents';
import type { Investigation } from '@/features/investigation';

interface OverviewPanelProps {
  incident: IncidentWithDetails | undefined;
  investigation: Investigation | null;
  onRefresh: () => void;
  canApprove?: boolean;
  onStartInvestigation?: () => void;
  isStarted?: boolean;
  unlockedTabs?: string[];
  completedTabs?: string[];
}

export function OverviewPanel({
  incident,
  investigation,
  onRefresh,
  canApprove,
  onStartInvestigation,
  isStarted = false,
  unlockedTabs = [],
  completedTabs = []
}: OverviewPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { isAdmin } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<'location' | 'contractor'>('location');

  const handleEditLocation = () => {
    setEditMode('location');
    setEditDialogOpen(true);
  };

  const handleEditContractor = () => {
    setEditMode('contractor');
    setEditDialogOpen(true);
  };

  // Show loading state if incident is not yet loaded
  if (!incident) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isLocked = (incident as IncidentWithDetails & { investigation_locked?: boolean }).investigation_locked ?? false;

  const totalVisibleTabs = unlockedTabs.length || 1;
  // simplified progress %
  const progressPercent = Math.max(0, Math.min(100, Math.round(((completedTabs.length + (isStarted ? 1 : 0)) / Math.max(5, totalVisibleTabs)) * 100)));

  return (
    <div className="space-y-6" dir={direction}>
      {/* Investigation Progress Summary - NEW */}
      {(incident.status === 'investigation_pending' || incident.status === 'investigation_in_progress') && (
        <Card className="border-primary/20 shadow-sm bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl">{t('investigation.overview.summaryTitle', 'Investigation Summary')}</CardTitle>
                <CardDescription>
                  {t('investigation.overview.startedOn', { date: investigation?.created_at ? new Date(investigation.created_at).toLocaleDateString() : 'Pending' })}
                </CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                <span className="font-bold text-xl">{progressPercent}%</span>
                <span className="text-sm text-muted-foreground uppercase">{t('investigation.progress', 'Complete')}</span>
              </div>
            </div>
            <Progress value={progressPercent} className="h-2.5 w-full mt-4" />
          </CardHeader>
          <CardContent className="pt-6">
            {!isStarted ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-4">
                <div className="p-3 bg-muted rounded-full">
                  <Play className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="font-medium text-lg text-foreground">{t('investigation.overview.readyToStart', 'Ready to Start Investigation')}</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mt-1 mb-4">
                    {t('investigation.overview.readyToStartDesc', 'Review the basic info below, then click start to unlock evidence, witness, and RCA tools.')}
                  </p>
                  <Button size="lg" onClick={onStartInvestigation} className="gap-2 group shadow-sm transition-all hover:shadow-md">
                    <Play className="h-4 w-4 fill-current group-hover:scale-110 transition-transform" />
                    {t('investigation.overview.startBtn', 'Start Investigation')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 py-2">
                {['overview', 'evidence', 'witnesses', 'rca', 'actions'].map((step, index, arr) => {
                  const isCompleted = completedTabs.includes(step) || step === 'overview';
                  const isCurrent = !isCompleted && completedTabs.length === index - 1;

                  return (
                    <div key={step} className="flex items-center">
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${isCompleted ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                          isCurrent ? "bg-primary/10 text-primary border border-primary/20" :
                            "text-muted-foreground"
                        }`}>
                        {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 opacity-50" />}
                        <span className="capitalize">{step}</span>
                      </div>
                      {index < arr.length - 1 && (
                        <div className={`w-4 h-px mx-1 sm:w-8 sm:mx-2 ${isCompleted ? 'bg-emerald-300 dark:bg-emerald-800' : 'bg-border'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approval Workflow Banner */}
      <ApprovalWorkflowBanner
        incident={incident}
        investigation={investigation}
        onRefresh={onRefresh}
        canApprove={canApprove}
      />

      {/* Two-column layout for main info */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reporter Information */}
        <ReporterInfoCard incident={incident} />

        {/* Investigator Assignment - show when investigation in progress OR investigator already assigned */}
        {(incident.status === 'investigation_in_progress' || investigation?.investigator_id) ? (
          <InvestigatorAssignmentCard
            incident={incident}
            investigation={investigation}
            onRefresh={onRefresh}
          />
        ) : (
          <Card className="bg-muted/50">
            <CardContent className="py-6 text-center text-muted-foreground">
              <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('investigation.overview.investigatorAwaitingApproval')}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Incident Information - Full width, read-only when locked */}
      <IncidentInfoCard
        incident={incident}
        isLocked={isLocked}
        onEditLocation={isAdmin && !isLocked ? handleEditLocation : undefined}
      />

      {/* Linked Assets Card */}
      <LinkedAssetsCard incidentId={incident.id} canEdit={!isLocked} />

      {/* Contractor Personnel - Show when incident is linked to a contractor company */}
      {incident.related_contractor_company_id && (
        <ContractorPersonnelCard
          companyId={incident.related_contractor_company_id}
          companyName={(incident as unknown).related_contractor_company?.company_name}
          onEditContractor={isAdmin && !isLocked ? handleEditContractor : undefined}
        />
      )}

      {/* Severity Adjustment - Only for investigator after assignment */}
      {investigation && (
        <SeverityAdjustmentCard
          incident={incident}
          investigation={investigation}
          onRefresh={onRefresh}
        />
      )}

      {/* Admin Edit Dialog */}
      {isAdmin && incident && (
        <AdminEditObservationDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          incident={incident}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}



