
import { useState } from "react";
import { useInvestigationContext } from "@/features/investigation/context/InvestigationContext";
import { EvidenceManager } from '@/features/investigation';
import { WitnessPanel } from '@/features/investigation';
import { IncidentInfoCard } from '@/features/investigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Users, Info, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IncidentWithDetails } from '@/features/incidents';
import { useTranslation } from "react-i18next";
import { useUpdateInvestigation } from '@/features/investigation';
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function DataCollectionStage() {
    const { incident, currentStage, allowedActions } = useInvestigationContext();
    const [activeTab, setActiveTab] = useState("overview");
    const { t } = useTranslation();

    if (!incident) return null;

    const canEdit = allowedActions.includes('add_evidence');
    const isLocked = !canEdit;

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="overview">
                        <Info className="h-4 w-4 mr-2" />
                        {t('investigation.tabs.overview', 'Overview')}
                    </TabsTrigger>
                    <TabsTrigger value="evidence">
                        <FileText className="h-4 w-4 mr-2" />
                        {t('investigation.tabs.evidence', 'Evidence')}
                    </TabsTrigger>
                    <TabsTrigger value="witnesses">
                        <Users className="h-4 w-4 mr-2" />
                        {t('investigation.tabs.witnesses', 'Witnesses')}
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="overview">
                        <IncidentInfoCard
                            incident={incident as IncidentWithDetails}
                            isLocked={true} // Overview is always read-only in this context? Or editable by admin? Let's say locked for now as per previous logic.
                        />
                    </TabsContent>

                    <TabsContent value="evidence">
                        <EvidenceManager
                            incidentId={incident.id}
                            incidentStatus={incident.status}
                            canEdit={canEdit}
                        />
                    </TabsContent>

                    <TabsContent value="witnesses">
                        <WitnessPanel
                            incidentId={incident.id}
                            incident={incident as IncidentWithDetails}
                            incidentStatus={incident.status}
                            canEdit={canEdit}
                        />
                    </TabsContent>
                </div>
            </Tabs>

            {canEdit && (
                <div className="flex justify-end pt-4 border-t">
                    <StageTransitionButton incidentId={incident.id} />
                </div>
            )}
        </div>
    );
}

function StageTransitionButton({ incidentId }: { incidentId: string }) {
    const { t } = useTranslation();
    const updateInvestigation = useUpdateInvestigation();
    const { investigation } = useInvestigationContext();

    const handleProceed = async () => {
        if (!investigation) return;

        try {
            await updateInvestigation.mutateAsync({
                id: investigation.id,
                incidentId,
                updates: {
                    immediate_cause: investigation.immediate_cause || "", // Ensure it's not null
                }
            });
            toast.success(t('investigation.stages.transition.analysis', 'Moving to Analysis Phase'));
        } catch (error) {
            console.error("Failed to transition", error);
            toast.error(t('common.error', 'Failed to proceed'));
        }
    };

    return (
        <Button onClick={handleProceed} disabled={updateInvestigation.isPending}>
            {updateInvestigation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
            {t('investigation.stages.proceedToAnalysis', 'Proceed to Root Cause Analysis')}
        </Button>
    );
}


