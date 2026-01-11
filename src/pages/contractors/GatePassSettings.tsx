import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Settings, Plus, Pencil, Trash2, Check, X, Building2, Users, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { UserSearchCombobox } from "@/components/admin/UserSearchCombobox";

type ApproverScope = "external" | "internal" | "both";

interface EditingApprover {
  id: string | null;
  user_id: string;
  approver_scope: ApproverScope;
  is_active: boolean;
}

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getScopeBadge = (scope: ApproverScope, t: (key: string, fallback: string) => string) => {
  switch (scope) {
    case "external":
      return (
        <Badge variant="outline" className="gap-1 border-orange-500/50 text-orange-600 dark:text-orange-400">
          <Building2 className="h-3 w-3" />
          {t("contractors.gatePasses.scopeExternal", "External")}
        </Badge>
      );
    case "internal":
      return (
        <Badge variant="outline" className="gap-1 border-blue-500/50 text-blue-600 dark:text-blue-400">
          <Users className="h-3 w-3" />
          {t("contractors.gatePasses.scopeInternal", "Internal")}
        </Badge>
      );
    case "both":
    default:
      return (
        <Badge variant="outline" className="gap-1 border-green-500/50 text-green-600 dark:text-green-400">
          <Globe className="h-3 w-3" />
          {t("contractors.gatePasses.scopeBoth", "Both")}
        </Badge>
      );
  }
};

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
    user_id: "",
    approver_scope: "both",
    is_active: true,
  });

  const handleStartEdit = (approver: GatePassApprover) => {
    setEditing({
      id: approver.id,
      user_id: approver.user_id || "",
      approver_scope: approver.approver_scope || "both",
      is_active: approver.is_active,
    });
  };

  const handleSaveEdit = async () => {
    if (!editing?.id || !editing.user_id) return;
    await updateApprover.mutateAsync({
      id: editing.id,
      user_id: editing.user_id,
      approver_scope: editing.approver_scope,
      is_active: editing.is_active,
    });
    setEditing(null);
  };

  const handleCancelEdit = () => {
    setEditing(null);
  };

  const handleAddNew = async () => {
    if (!newApprover.user_id) return;
    
    // Generate a code from timestamp for uniqueness
    const code = `approver_${Date.now()}`;
    
    await createApprover.mutateAsync({
      name: "Approver", // Will be displayed from user profile
      code: code,
      user_id: newApprover.user_id,
      approver_scope: newApprover.approver_scope,
      is_active: newApprover.is_active,
      sort_order: approvers.length + 1,
    });
    setNewApprover({
      id: null,
      user_id: "",
      approver_scope: "both",
      is_active: true,
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
                <TableHead className="w-[300px]">
                  {t("contractors.gatePasses.approverUser", "User")}
                </TableHead>
                <TableHead className="w-[150px]">
                  {t("contractors.gatePasses.approverScope", "Scope")}
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
                    <UserSearchCombobox
                      value={newApprover.user_id}
                      onSelect={(userId) => setNewApprover({ ...newApprover, user_id: userId || "" })}
                      placeholder={t("contractors.gatePasses.selectUser", "Select user...")}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={newApprover.approver_scope}
                      onValueChange={(value: ApproverScope) => 
                        setNewApprover({ ...newApprover, approver_scope: value })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="external">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-orange-500" />
                            {t("contractors.gatePasses.scopeExternal", "External")}
                          </div>
                        </SelectItem>
                        <SelectItem value="internal">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            {t("contractors.gatePasses.scopeInternal", "Internal")}
                          </div>
                        </SelectItem>
                        <SelectItem value="both">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-green-500" />
                            {t("contractors.gatePasses.scopeBoth", "Both")}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                        disabled={!newApprover.user_id}
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
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {t("common.loading", "Loading...")}
                  </TableCell>
                </TableRow>
              ) : approvers.length === 0 && !isAdding ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {t("contractors.gatePasses.noApprovers", "No approvers configured. Add one to get started.")}
                  </TableCell>
                </TableRow>
              ) : (
                approvers.map((approver) => (
                  <TableRow key={approver.id}>
                    {editing?.id === approver.id ? (
                      <>
                        <TableCell>
                          <UserSearchCombobox
                            value={editing.user_id}
                            onSelect={(userId) => setEditing({ ...editing, user_id: userId || "" })}
                            placeholder={t("contractors.gatePasses.selectUser", "Select user...")}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={editing.approver_scope}
                            onValueChange={(value: ApproverScope) => 
                              setEditing({ ...editing, approver_scope: value })
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="external">
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-orange-500" />
                                  {t("contractors.gatePasses.scopeExternal", "External")}
                                </div>
                              </SelectItem>
                              <SelectItem value="internal">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-blue-500" />
                                  {t("contractors.gatePasses.scopeInternal", "Internal")}
                                </div>
                              </SelectItem>
                              <SelectItem value="both">
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-green-500" />
                                  {t("contractors.gatePasses.scopeBoth", "Both")}
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
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
                              disabled={!editing.user_id}
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
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={approver.user?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(approver.user?.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {approver.user?.full_name || approver.name}
                              </p>
                              {approver.user?.job_title && (
                                <p className="text-sm text-muted-foreground">
                                  {approver.user.job_title}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getScopeBadge(approver.approver_scope, t)}
                        </TableCell>
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
