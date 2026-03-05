import React from "react";
import { Loader2, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ActionsPanelProps } from "./types";
import { useActionsPanelState } from "./hooks/useActionsPanelState";
import { ActionFormDialog } from "./components/ActionFormDialog";
import { ActionList } from "./components/ActionList";

export function ActionsPanel(props: ActionsPanelProps) {
  const state = useActionsPanelState(props);
  const {
    t, direction, isLocked, isLoading, incidentStatus: (state as any).incidentStatus,
    deleteConfirmId, setDeleteConfirmId, handleDeleteAction, deleteAction
  } = state;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={direction}>
      {/* Locked Banner for Closed Incidents */}
      {incidentStatus === 'closed' && (
        <Alert className="border-muted bg-muted/50">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            {t('investigation.actions.lockedClosed', 'This incident is closed. Corrective actions cannot be modified.')}
          </AlertDescription>
        </Alert>
      )}

      {/* Read-Only Oversight Banner - For non-investigators */}
      {isLocked && incidentStatus !== 'closed' && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
          <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            {t('investigation.readOnlyOversight', 'You are viewing this investigation in read-only mode. Only the assigned investigator can make changes.')}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {t('investigation.actions.title', 'Corrective Actions')}
        </h3>
        
        <ActionFormDialog state={state} />
      </div>

      <ActionList state={state} incidentId={props.incidentId} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('investigation.actions.confirmDelete', 'Delete Action?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('investigation.actions.deleteWarning', 'This action will be permanently deleted. This cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAction}
              disabled={deleteAction.isPending}
            >
              {deleteAction.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

