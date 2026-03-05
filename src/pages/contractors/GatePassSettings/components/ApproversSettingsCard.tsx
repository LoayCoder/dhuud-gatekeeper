import React from "react";
import { Plus, Pencil, Trash2, Check, X, Building2, Users, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserSearchCombobox } from '@/features/admin';
import { getInitials, getScopeBadge } from "../utils";
import { ApproverScope } from "../types";

export function ApproversSettingsCard({ state }: { state: ReturnType<typeof import('../hooks/useGatePassSettings').useGatePassSettings> }) {
  const {
    t,
    isAdding, setIsAdding, newApprover, setNewApprover, handleAddNew,
    isLoading, approvers, editing, setEditing, handleSaveEdit, handleCancelEdit,
    handleStartEdit, handleToggleActive, setDeleteId
  } = state;

  return (
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

  );
}

