import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IncidentOverviewTab } from "./IncidentOverviewTab";
import { IncidentInvestigationTab } from "./IncidentInvestigationTab";
import { IncidentActionsTab } from "./IncidentActionsTab";
import { IncidentEvidenceTab } from "./IncidentEvidenceTab";
import { AuditLogPanel } from "@/components/investigation/AuditLogPanel";
import { LayoutDashboard, Clock, CheckSquare, FileText, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Incident } from "@/types/incidents";

interface IncidentTabsProps {
    incident: Incident;
    isPrinting?: boolean;
}

export function IncidentTabs({ incident, isPrinting }: IncidentTabsProps) {
    const { t, i18n } = useTranslation();
    const direction = i18n.dir();

    return (
        <Tabs defaultValue="overview" className="w-full" dir={direction}>
            <div className="overflow-x-auto pb-2">
                <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 gap-2">
                    <TabsTrigger value="overview" className="gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <LayoutDashboard className="h-4 w-4" />
                        {t('incidents.tabs.overview', 'Overview')}
                    </TabsTrigger>
                    <TabsTrigger value="investigation" className="gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Clock className="h-4 w-4" />
                        {t('incidents.tabs.investigation', 'Investigation')}
                    </TabsTrigger>
                    <TabsTrigger value="actions" className="gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <CheckSquare className="h-4 w-4" />
                        {t('incidents.tabs.actions', 'Actions')}
                    </TabsTrigger>
                    <TabsTrigger value="evidence" className="gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <FileText className="h-4 w-4" />
                        {t('incidents.tabs.evidence', 'Evidence')}
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <History className="h-4 w-4" />
                        {t('incidents.tabs.audit', 'Audit Log')}
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="mt-6 space-y-6">
                <TabsContent value="overview" className="m-0 focus-visible:ring-0">
                    <IncidentOverviewTab incident={incident} />
                </TabsContent>

                <TabsContent value="investigation" className="m-0 focus-visible:ring-0">
                    <IncidentInvestigationTab incidentId={incident.id} />
                </TabsContent>

                <TabsContent value="actions" className="m-0 focus-visible:ring-0">
                    <IncidentActionsTab incidentId={incident.id} />
                </TabsContent>

                <TabsContent value="evidence" className="m-0 focus-visible:ring-0">
                    <IncidentEvidenceTab incident={incident} />
                </TabsContent>

                <TabsContent value="audit" className="m-0 focus-visible:ring-0">
                    <AuditLogPanel
                        referenceId={incident.id}
                        tableName="incidents"
                        excludeColumns={['updated_at', 'search_vector']}
                    />
                </TabsContent>
            </div>
        </Tabs>
    );
}
