import { useEffect } from "react";
import {
    useClientSiteRepCompanies,
    useClientSiteRepWorkers,
    useClientSiteRepProjects,
    useClientSiteRepGatePasses,
    useClientSiteRepIncidents,
    useClientSiteRepViolations,
    useClientSiteRepPersonnel,
} from "./use-client-site-rep-queries";
import { validateWidgetData } from "./types";
import type {
    ClientSiteRepWorkerDetail,
    ClientSiteRepProjectDetail,
    ClientSiteRepGatePassDetail,
    ClientSiteRepIncidentDetail,
} from "./types";

export function useClientSiteRepData() {
    const { data: companies = [], isLoading: companiesLoading } = useClientSiteRepCompanies();
    const companyIds = companies.map(c => c.id);

    const { data: workerData, isLoading: workersLoading } = useClientSiteRepWorkers(companyIds);
    const { data: projectData, isLoading: projectsLoading } = useClientSiteRepProjects(companyIds);
    const { data: gatePassData, isLoading: gatePassesLoading } = useClientSiteRepGatePasses(companyIds);
    const { data: incidentData, isLoading: incidentsLoading } = useClientSiteRepIncidents(companyIds);
    const { data: violations = [], isLoading: violationsLoading } = useClientSiteRepViolations(companyIds);
    const { data: personnel, isLoading: personnelLoading } = useClientSiteRepPersonnel(companyIds);

    // Data validation logging
    useEffect(() => {
        if (!companiesLoading && !workersLoading && !projectsLoading && !gatePassesLoading && !incidentsLoading && !violationsLoading && !personnelLoading) {
            const validations = [
                { name: 'companies', data: companies, valid: validateWidgetData('companies', companies) },
                { name: 'workerData', data: workerData, valid: validateWidgetData('workerData', workerData) },
                { name: 'projectData', data: projectData, valid: validateWidgetData('projectData', projectData) },
                { name: 'gatePassData', data: gatePassData, valid: validateWidgetData('gatePassData', gatePassData) },
                { name: 'incidentData', data: incidentData, valid: validateWidgetData('incidentData', incidentData) },
                { name: 'violations', data: violations, valid: validateWidgetData('violations', violations) },
                { name: 'personnel', data: personnel, valid: validateWidgetData('personnel', personnel) },
            ];

            const invalid = validations.filter(v => !v.valid);
            if (invalid.length > 0) {
                console.warn('[Dashboard] Widgets without data sources:', invalid.map(v => v.name).join(', '));
            }
        }
    }, [companies, workerData, projectData, gatePassData, incidentData, violations, personnel, companiesLoading, workersLoading, projectsLoading, gatePassesLoading, incidentsLoading, violationsLoading, personnelLoading]);

    const defaultWorkerData = { summary: { total: 0, approved: 0, pending: 0, rejected: 0, blacklisted: 0 }, allWorkers: [] as ClientSiteRepWorkerDetail[] };
    const defaultProjectData = { summary: { total: 0, active: 0, planned: 0, completed: 0, on_hold: 0 }, allProjects: [] as ClientSiteRepProjectDetail[] };
    const defaultGatePassData = { summary: { total: 0, pending: 0, approved: 0, rejected: 0, expired: 0 }, allGatePasses: [] as ClientSiteRepGatePassDetail[] };
    const defaultIncidentData = { summary: { total: 0, open: 0, under_investigation: 0, closed: 0 }, allIncidents: [] as ClientSiteRepIncidentDetail[] };

    return {
        companies,
        companyIds,
        workerSummary: workerData?.summary || defaultWorkerData.summary,
        allWorkers: workerData?.allWorkers || defaultWorkerData.allWorkers,
        projectSummary: projectData?.summary || defaultProjectData.summary,
        allProjects: projectData?.allProjects || defaultProjectData.allProjects,
        gatePassSummary: gatePassData?.summary || defaultGatePassData.summary,
        allGatePasses: gatePassData?.allGatePasses || defaultGatePassData.allGatePasses,
        incidentSummary: incidentData?.summary || defaultIncidentData.summary,
        allIncidents: incidentData?.allIncidents || defaultIncidentData.allIncidents,
        violations,
        personnel: personnel || { safetyOfficers: [], contractorReps: [] },
        isLoading: companiesLoading || workersLoading || projectsLoading || gatePassesLoading || incidentsLoading || violationsLoading || personnelLoading,
    };
}
