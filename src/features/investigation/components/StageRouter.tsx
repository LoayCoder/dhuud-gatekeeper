
import { useInvestigationContext } from "../context/InvestigationContext";
import { WorkflowStage } from "../types";
import { TriageStage } from "./stages/TriageStage";
import { AssignmentStage } from "./stages/AssignmentStage";
import { DataCollectionStage } from "./stages/DataCollectionStage";
import { AnalysisStage } from "./stages/AnalysisStage";
import { ReviewStage } from "./stages/ReviewStage";
import { ClosureStage } from "./stages/ClosureStage";

export function StageRouter() {
    const { currentStage } = useInvestigationContext();

    switch (currentStage) {
        case WorkflowStage.Triage:
            return <TriageStage />;
        case WorkflowStage.Assignment:
            return <AssignmentStage />;
        case WorkflowStage.DataCollection:
            return <DataCollectionStage />;
        case WorkflowStage.Analysis:
            return <AnalysisStage />;
        case WorkflowStage.ActionPlanning: // Often combined with Analysis or Review
            return <AnalysisStage />; // For now render Analysis, or create separate
        case WorkflowStage.Review:
            return <ReviewStage />;
        case WorkflowStage.Closure:
            return <ClosureStage />;
        case WorkflowStage.ReadOnly:
        default:
            return (
                <div className="p-8 text-center text-muted-foreground">
                    Investigation data is not available or you do not have permission to view it.
                </div>
            );
    }
}
