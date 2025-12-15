import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  useAllGatePassApprovers,
  useCreateGatePassApprover,
  useUpdateGatePassApprover,
  useDeleteGatePassApprover,
  GatePassApprover,
} from "@/hooks/contractor-management/use-gate-pass-approvers";

interface EditingApprover {
  id: string | null;
  name: string;
  name_ar: string;
  code: string;
  is_active: boolean;
  sort_order: number;
}

const GatePassSettings = () => {
  const { t } = useTranslation();
  const { data: approvers = [], isLoading } = useAllGatePassApprovers();
  const createApprover = useCreateGatePassApprover();
  const updateApprover = useUpdateGatePassApprover();
  const deleteApprover = useDeleteGatePassApprover();

  const [editing, setEditing] = useState<EditingApprover | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [newApprover, setNewApprover] = useState<EditingApprover>({
    id: null,
    name: "",
    name_ar: "",
    code: "",
    is_active: true,
    sort_order: 0,
  });

  const handleStartEdit = (approver: GatePassApprover) => {
    setEditing({
      id: approver.id,
      name: approver.name,
      name_ar: approver.name_ar || "",
      code: approver.code,
      is_active: approver.is_active,
      sort_order: approver.sort_order,
    });
  };

  const handleSaveEdit = async () => {
    if (!editing?.id) return;
    await updateApprover.mutateAsync({
      id: editing.id,
      name: editing.name,
      name_ar: editing.name_ar || null,
      code: editing.code,
      is_active: editing.is_active,
      sort_order: editing.sort_order,
    });
    setEditing(null);
  };

  const handleCancelEdit = () => {
    setEditing(null);
  };

  const handleAddNew = async () => {
    if (!newApprover.name || !newApprover.code) return;
    await createApprover.mutateAsync({
      name: newApprover.name,
      name_ar: newApprover.name_ar || undefined,
      code: newApprover.code.toLowerCase().replace(/\s+/g, "_"),
      is_active: newApprover.is_active,
      sort_order: approvers.length + 1,
    });
    setNewApprover({
      id: null,
      name: "",
      name_ar: "",
      code: "",
      is_active: true,
      sort_order: 0,
    });
    setIsAdding(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteApprover.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleToggleActive = async (approver: GatePassApprover) => {
    await updateApprover.mutateAsync({
      id: approver.id,
      is_active: !approver.is_active,
    });
  };

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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              {t("contractors.gatePasses.approverSources", "Approval Sources")}
            </CardTitle>
            <CardDescription>
              {t("contractors.gatePasses.approverSourcesDescription", "Define who can approve gate pass requests")}
            </CardDescription>
          </div>
          <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
            <Plus className="h-4 w-4 me-2" />
            {t("contractors.gatePasses.addApprover", "Add Approver")}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">
                  {t("contractors.gatePasses.approverCode", "Code")}
                </TableHead>
                <TableHead>
                  {t("contractors.gatePasses.approverName", "Name")}
                </TableHead>
                <TableHead>
                  {t("contractors.gatePasses.approverNameAr", "Name (Arabic)")}
                </TableHead>
                <TableHead className="w-[80px] text-center">
                  {t("common.active", "Active")}
                </TableHead>
                <TableHead className="w-[100px] text-end">
                  {t("common.actions", "Actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isAdding && (
                <TableRow>
                  <TableCell>
                    <Input
                      value={newApprover.code}
                      onChange={(e) => setNewApprover({ ...newApprover, code: e.target.value })}
                      placeholder="pm"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newApprover.name}
                      onChange={(e) => setNewApprover({ ...newApprover, name: e.target.value })}
                      placeholder="Project Manager"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={newApprover.name_ar}
                      onChange={(e) => setNewApprover({ ...newApprover, name_ar: e.target.value })}
                      placeholder="مدير المشروع"
                      className="h-8"
                      dir="rtl"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={newApprover.is_active}
                      onCheckedChange={(checked) => setNewApprover({ ...newApprover, is_active: checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-600"
                        onClick={handleAddNew}
                        disabled={!newApprover.name || !newApprover.code}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setIsAdding(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t("common.loading", "Loading...")}
                  </TableCell>
                </TableRow>
              ) : approvers.length === 0 && !isAdding ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t("contractors.gatePasses.noApprovers", "No approvers configured. Add one to get started.")}
                  </TableCell>
                </TableRow>
              ) : (
                approvers.map((approver) => (
                  <TableRow key={approver.id}>
                    {editing?.id === approver.id ? (
                      <>
                        <TableCell>
                          <Input
                            value={editing.code}
                            onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editing.name}
                            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editing.name_ar}
                            onChange={(e) => setEditing({ ...editing, name_ar: e.target.value })}
                            className="h-8"
                            dir="rtl"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={editing.is_active}
                            onCheckedChange={(checked) => setEditing({ ...editing, is_active: checked })}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-green-600"
                              onClick={handleSaveEdit}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-mono text-sm">{approver.code}</TableCell>
                        <TableCell>{approver.name}</TableCell>
                        <TableCell dir="rtl">{approver.name_ar || "-"}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={approver.is_active}
                            onCheckedChange={() => handleToggleActive(approver)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleStartEdit(approver)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => setDeleteId(approver.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
    </div>
  );
};

export default GatePassSettings;
