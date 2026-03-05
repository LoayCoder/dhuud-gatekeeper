import React from "react";
import { Settings } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGatePassSettings } from "./hooks/useGatePassSettings";
import { ApproversSettingsCard } from "./components/ApproversSettingsCard";
import { PassTypeSettingsCard } from "./components/PassTypeSettingsCard";

export default function GatePassSettings() {
  const state = useGatePassSettings();
  const { t, deleteId, setDeleteId, handleDelete, deleteTypeId, setDeleteTypeId, handleDeleteType } = state;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">
            {t("contractors.gatePasses.settings", "Gate Pass Settings")}
          </h1>
          <p className="text-muted-foreground">
            {t("contractors.gatePasses.settingsDescription", "Configure approver options for gate pass requests")}
          </p>
        </div>
      </div>

      <ApproversSettingsCard state={state} />
      <PassTypeSettingsCard state={state} />

      {/* Delete Approver Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("contractors.gatePasses.deleteApproverTitle", "Delete Approver?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("contractors.gatePasses.deleteApproverDescription", "This approver will be removed from the list. Existing gate passes using this approver will not be affected.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t("common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Pass Type Dialog */}
      <AlertDialog open={!!deleteTypeId} onOpenChange={() => setDeleteTypeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("contractors.gatePasses.deletePassTypeTitle", "Delete Pass Type?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("contractors.gatePasses.deletePassTypeDescription", "This pass type will be removed from the list. Existing gate passes using this type will not be affected.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteType} className="bg-destructive text-destructive-foreground">
              {t("common.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
