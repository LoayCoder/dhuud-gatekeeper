import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileSearch, Users, Search, ListChecks, LayoutDashboard } from "lucide-react";
import { useIncidents, useIncident } from "@/hooks/use-incidents";
import { useInvestigation } from "@/hooks/use-investigation";
import { EvidencePanel, WitnessPanel, RCAPanel, ActionsPanel, AuditLogPanel, OverviewPanel } from "@/components/investigation";

export default function InvestigationWorkspace() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [searchParams] = useSearchParams();
  const urlIncidentId = searchParams.get('incident');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(urlIncidentId);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: incidents, isLoading: loadingIncidents } = useIncidents();
  const { data: selectedIncident, refetch: refetchIncident } = useIncident(selectedIncidentId || undefined);
  const { data: investigation, refetch: refetchInvestigation } = useInvestigation(selectedIncidentId);

  const handleRefresh = () => {
    refetchIncident();
    refetchInvestigation();
  };

  // Filter incidents that need investigation (not closed status)
  const investigableIncidents = incidents?.filter(
    (inc) => inc.status !== 'closed'
  );

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case 'investigation_in_progress':
      case 'under_investigation':
        return 'default';
      case 'submitted':
        return 'secondary';
      case 'investigation_pending':
        return 'outline';
      case 'closed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('investigation.title', 'Investigation Workspace')}
        </h1>
        <p className="text-muted-foreground">
          {t('investigation.description', 'Investigate incidents, collect evidence, and track corrective actions')}
        </p>
      </div>

      {/* Incident Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t('investigation.selectIncident', 'Select Incident to Investigate')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingIncidents ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.loading', 'Loading...')}
            </div>
          ) : (
            <Select
              value={selectedIncidentId || ''}
              onValueChange={(value) => setSelectedIncidentId(value)}
            >
              <SelectTrigger className="w-full md:w-[400px]">
                <SelectValue placeholder={t('investigation.selectIncidentPlaceholder', 'Choose an incident...')} />
              </SelectTrigger>
              <SelectContent dir={direction}>
                {investigableIncidents?.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    {t('investigation.noIncidents', 'No incidents available for investigation')}
                  </div>
                ) : (
                  investigableIncidents?.map((incident) => (
                    <SelectItem key={incident.id} value={incident.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{incident.reference_id}</span>
                        <span className="truncate max-w-[200px]">{incident.title}</span>
                        <Badge variant={getStatusVariant(incident.status)} className="ms-auto">
                          {incident.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Investigation Tabs */}
      {selectedIncidentId ? (
        <>
          {/* Selected Incident Info */}
          {selectedIncident && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedIncident.title}</CardTitle>
                    <CardDescription className="font-mono">
                      {selectedIncident.reference_id}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusVariant(selectedIncident.status)}>
                    {t(`incidents.status.${selectedIncident.status}`)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {selectedIncident.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction}>
            <TabsList className="flex flex-wrap h-auto gap-1 w-full">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">{t('investigation.tabs.overview', 'Overview')}</span>
              </TabsTrigger>
              <TabsTrigger value="evidence" className="flex items-center gap-2">
                <FileSearch className="h-4 w-4" />
                <span className="hidden sm:inline">{t('investigation.tabs.evidence', 'Evidence')}</span>
              </TabsTrigger>
              <TabsTrigger value="witnesses" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">{t('investigation.tabs.witnesses', 'Witnesses')}</span>
              </TabsTrigger>
              <TabsTrigger value="rca" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">{t('investigation.tabs.rca', 'RCA')}</span>
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                <span className="hidden sm:inline">{t('investigation.tabs.actions', 'Actions')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <OverviewPanel 
                incident={selectedIncident} 
                investigation={investigation ?? null}
                onRefresh={handleRefresh}
              />
            </TabsContent>

            <TabsContent value="evidence" className="mt-4">
              <EvidencePanel incidentId={selectedIncidentId} />
            </TabsContent>

            <TabsContent value="witnesses" className="mt-4">
              <WitnessPanel incidentId={selectedIncidentId} />
            </TabsContent>

            <TabsContent value="rca" className="mt-4">
              <RCAPanel incidentId={selectedIncidentId} />
            </TabsContent>

            <TabsContent value="actions" className="mt-4">
              <ActionsPanel incidentId={selectedIncidentId} />
            </TabsContent>
          </Tabs>

          {/* Audit Log */}
          <AuditLogPanel incidentId={selectedIncidentId} />
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {t('investigation.selectToStart', 'Select an incident above to begin investigation')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
