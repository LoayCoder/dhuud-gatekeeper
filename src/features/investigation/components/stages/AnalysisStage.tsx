
import { useState } from "react";
import { useInvestigationContext } from "@/features/investigation/context/InvestigationContext";
import { RCAPanel } from '@/features/investigation';
import { ActionsPanel } from '@/features/investigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrainCircuit, CheckSquare, Info } from "lucide-react";
import { IncidentWithDetails } from '@/features/incidents';
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";

import { SubmitInvestigationCard } from '@/features/investigation';
import { Send } from "lucide-react";

export function AnalysisStage() {
    const { incident, currentStage, refresh, allowedActions } = useInvestigationContext();
    const [activeTab, setActiveTab] = useState("rca");
    const { t } = useTranslation();

    if (!incident) return null;

    const canEdit = allowedActions.includes('edit_rca');
    // const isLocked = !canEdit; // Logic handled per component

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight">
                    {t('investigation.stages.analysis.title', 'Analysis & Action Planning')}
                </h2>
                <p className="text-muted-foreground">
                    {t('investigation.stages.analysis.subtitle', 'Determine root causes and plan corrective actions.')}
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
                    <TabsTrigger value="rca">
                        <BrainCircuit className="h-4 w-4 mr-2" />
                        {t('investigation.tabs.rca', 'Root Cause Analysis')}
                    </TabsTrigger>
                    <TabsTrigger value="actions">
                        <CheckSquare className="h-4 w-4 mr-2" />
                        {t('investigation.tabs.actions', 'Corrective Actions')}
                    </TabsTrigger>
                    <TabsTrigger value="submit">
                        <Send className="h-4 w-4 mr-2" />
                        {t('investigation.tabs.submit', 'Complete & Submit')}
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="rca">
                        <RCAPanel
                            incidentId={incident.id}
                            incidentTitle={incident.title}
                            incidentDescription={incident.description}
                            incidentStatus={incident.status}
                            incidentSeverity={incident.severity_v2 || (incident as unknown).severity}
                            incidentEventType={incident.event_type}
                            incidentEventSubtype={incident.subtype}
                            canEdit={canEdit}
                        />
                    </TabsContent>

                    <TabsContent value="actions">
                        <ActionsPanel
                            incidentId={incident.id}
                            incidentStatus={incident.status}
                            canEdit={canEdit}
                            onActionChange={refresh}
                        />
                    </TabsContent>

                    <TabsContent value="submit">
                        <SubmitInvestigationCard
                            incidentId={incident.id}
                            onSubmitted={refresh}
                        />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}


