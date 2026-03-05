import { useTranslation } from "react-i18next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Eye, Lock, RotateCcw } from "lucide-react";

interface InvestigationWorkspaceBannersProps {
    investigationAllowed: boolean | undefined;
    editAccess: { isReadOnly?: boolean; isClosed?: boolean; isOversightRole?: boolean; canReopen?: boolean;[key: string]: unknown };
    setShowReopenDialog: (show: boolean) => void;
}

export function InvestigationWorkspaceBanners({
    investigationAllowed,
    editAccess,
    setShowReopenDialog
}: InvestigationWorkspaceBannersProps) {
    const { t } = useTranslation();

    return (
        <>
            {/* Warning if investigation not yet allowed */}
            {!investigationAllowed && (
                <Card className="border-warning/30 bg-warning/5">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-warning/10">
                                <AlertCircle className="h-5 w-5 text-warning" />
                            </div>
                            <div>
                                <p className="font-medium text-foreground">
                                    {t('investigation.workflow.pendingApproval', 'Pending Approval')}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {t('investigation.workflow.completeWorkflowFirst', 'Complete the approval workflow above before accessing investigation tools.')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Read-only oversight banner */}
            {investigationAllowed && editAccess.isReadOnly && !editAccess.isClosed && (
                <Alert className="border-info/30 bg-info/5">
                    <Eye className="h-4 w-4 text-info" />
                    <AlertDescription className="text-foreground">
                        {editAccess.isOversightRole
                            ? t('investigation.readOnly.oversightBanner', 'You have read-only access to monitor this investigation. Only the assigned investigator can make changes.')
                            : t('investigation.readOnly.notAssigned', 'You are not the assigned investigator. Investigation data is read-only.')}
                    </AlertDescription>
                </Alert>
            )}

            {/* Closed incident banner with reopen option */}
            {editAccess.isClosed && (
                <Alert className="border-success/30 bg-success/5">
                    <Lock className="h-4 w-4 text-success" />
                    <AlertDescription className="flex items-center justify-between text-foreground">
                        <span>{t('investigation.readOnly.closedBanner', 'This incident is closed and all data is locked.')}</span>
                        {editAccess.canReopen && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowReopenDialog(true)}
                                className="ms-4 border-success/30 hover:bg-success/10"
                            >
                                <RotateCcw className="h-4 w-4 me-2" />
                                {t('investigation.reopen.button', 'Reopen Investigation')}
                            </Button>
                        )}
                    </AlertDescription>
                </Alert>
            )}
        </>
    );
}
