
import { createContext, useContext, ReactNode, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useIncident } from "@/hooks/use-incidents";
import { useInvestigation } from "@/hooks/use-investigation";
import { useInvestigationWorkflow } from "../hooks/useInvestigationWorkflow";
import {
    Incident,
    InvestigationRecord,
    InvestigationContextType,
    WorkflowStage,
    InvestigationRole
} from "../types";

const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

export const InvestigationProvider = ({ children }: { children: ReactNode }) => {
    const [searchParams] = useSearchParams();
    const incidentId = searchParams.get('incident');
    const queryClient = useQueryClient();

    // Fetch Incident Data
    const {
        data: incident,
        isLoading: isIncidentLoading,
        error: incidentError,
        refetch: refetchIncident
    } = useIncident(incidentId || undefined);

    // Fetch Investigation Data
    const {
        data: investigation,
        isLoading: isInvestigationLoading,
        error: investigationError,
        refetch: refetchInvestigation
    } = useInvestigation(incidentId); // useInvestigation handles null check internally

    // Calculate Workflow State
    const { currentStage, userRole, allowedActions, userPermissions } = useInvestigationWorkflow(
        incident as unknown as Incident | null,
        investigation as unknown as InvestigationRecord | null
    );

    const refresh = () => {
        refetchIncident();
        refetchInvestigation();
        // Invalidate related caches
        queryClient.invalidateQueries({ queryKey: ['workflow-actors', incidentId] });
        queryClient.invalidateQueries({ queryKey: ['corrective-actions', incidentId] });
    };

    const value: InvestigationContextType = {
        incidentId,
        incident: (incident as unknown as Incident) || null,
        investigation: (investigation as unknown as InvestigationRecord) || null,
        isLoading: isIncidentLoading || isInvestigationLoading,
        error: (incidentError as Error) || (investigationError as Error) || null,
        currentStage,
        userRole,
        allowedActions,
        userPermissions,
        refresh
    };

    return (
        <InvestigationContext.Provider value={value}>
            {children}
        </InvestigationContext.Provider>
    );
};

export const useInvestigationContext = () => {
    const context = useContext(InvestigationContext);
    if (context === undefined) {
        throw new Error('useInvestigationContext must be used within an InvestigationProvider');
    }
    return context;
};
