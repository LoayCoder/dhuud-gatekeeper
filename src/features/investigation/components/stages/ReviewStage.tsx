
import { useInvestigationContext } from "@/features/investigation/context/InvestigationContext";
import { ApprovalWorkflowBanner } from "@/components/investigation/ApprovalWorkflowBanner";
import { IncidentClosureRequestDialog } from "@/components/investigation/IncidentClosureRequestDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Lock, FileCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { IncidentWithDetails } from "@/hooks/use-incidents";
import { Investigation } from "@/hooks/use-investigation";

export function ReviewStage() {
    const { incident, investigation, refresh } = useInvestigationContext();
    const { t } = useTranslation();

    if (!incident) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight">
                    {t('investigation.stages.review.title', 'Review & Approval')}
                </h2>
                <p className="text-muted-foreground">
                    {t('investigation.stages.review.subtitle', 'Review investigation findings and obtain necessary approvals.')}
                </p>
            </div>

            <ApprovalWorkflowBanner
                incident={incident as unknown as IncidentWithDetails}
                investigation={investigation as unknown as Investigation}
                onRefresh={refresh}
                canApprove={true}
            />
        </div>
    );
}

export function ClosureStage() {
    const { incident, investigation, refresh } = useInvestigationContext();
    const { t } = useTranslation();
    const [closureDialogOpen, setClosureDialogOpen] = useState(false);

    if (!incident) return null;

    const isClosed = incident.status === 'closed';

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight">
                    {t('investigation.stages.closure.title', 'Investigation Closure')}
                </h2>
                <p className="text-muted-foreground">
                    {t('investigation.stages.closure.subtitle', 'Finalize and close the investigation.')}
                </p>
            </div>

            {isClosed ? (
                <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                    <CardContent className="pt-6 text-center">
                        <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
                        <h3 className="text-xl font-semibold text-green-800 dark:text-green-300">
                            {t('investigation.closure.completed', 'Investigation Closed')}
                        </h3>
                        <p className="text-green-700 dark:text-green-400 mt-2">
                            {t('investigation.closure.completedDesc', 'This investigation has been successfully completed and closed.')}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>{t('investigation.closure.actions', 'Closure Actions')}</CardTitle>
                        <CardDescription>{t('investigation.closure.actionsDesc', 'Complete the final steps to close this investigation.')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => setClosureDialogOpen(true)}>
                            <FileCheck className="h-4 w-4 me-2" />
                            {t('investigation.closure.requestClosure', 'Request Closure')}
                        </Button>
                    </CardContent>
                </Card>
            )}

            <IncidentClosureRequestDialog
                open={closureDialogOpen}
                onOpenChange={setClosureDialogOpen}
                incidentId={incident.id}
            />
        </div>
    );
}
