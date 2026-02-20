
import { useInvestigationContext } from "@/features/investigation/context/InvestigationContext";
import { WorkflowStepper } from "@/features/investigation/components/workflow/WorkflowStepper";
import { StageRouter } from "@/features/investigation/components/StageRouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, FileText, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

export function InvestigationLayout() {
    const { incident, isLoading, error, refresh, currentStage, userRole } = useInvestigationContext();
    const navigate = useNavigate();
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">{t('common.loading', 'Loading investigation data...')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <h2 className="text-xl font-semibold">{t('common.error', 'Something went wrong')}</h2>
                <p className="text-muted-foreground mb-4">{error.message}</p>
                <Button onClick={refresh}>{t('common.retry', 'Retry')}</Button>
                <Button variant="ghost" onClick={() => navigate('/incidents')}>
                    {t('incidents.backToList', 'Back to List')}
                </Button>
            </div>
        );
    }

    if (!incident) {
        return (
            <div className="container py-8">
                <div className="text-center">
                    <h2 className="text-xl font-semibold">Incident Not Found</h2>
                    <Button variant="outline" className="mt-4" onClick={() => navigate('/incidents')}>
                        Back to List
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-7xl py-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-2 h-8 w-8 p-0"
                            onClick={() => navigate('/incidents')}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {incident.reference_id} - {incident.title}
                        </h1>
                        <Badge variant="outline" className="ml-2 capitalize">
                            {userRole.replace('_', ' ')} View
                        </Badge>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {t('investigation.subtitle', 'Investigation Workspace')}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={refresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('common.refresh', 'Refresh')}
                    </Button>
                </div>
            </div>

            {/* Workflow Stepper */}
            <WorkflowStepper currentStage={currentStage} />

            {/* Main Content (Stage Router) */}
            <div className="mt-6">
                <StageRouter />
            </div>
        </div>
    );
}
