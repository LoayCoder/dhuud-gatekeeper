import React from "react";
import { Plus, Pencil, Trash2, Check, X, Building2, Users, Globe, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getScopeBadge } from "../utils";
import { PassTypeScope } from "@/features/contractors/hooks/use-gate-pass-types";

export function PassTypeSettingsCard({ state }: { state: ReturnType<typeof import('../hooks/useGatePassSettings').useGatePassSettings> }) {
  const {
    t,
    isAddingType, setIsAddingType, newPassType, setNewPassType, handleAddNewType,
    isLoadingTypes, passTypes, editingType, setEditingType, handleSaveEditType, handleCancelEditType,
    handleStartEditType, handleToggleTypeActive, setDeleteTypeId
  } = state;

  return (

    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t("contractors.gatePasses.passTypeControl", "Pass Type Control")}
          </CardTitle>
          <CardDescription>
            {t("contractors.gatePasses.passTypeControlDescription", "Configure which pass types are available for different user groups")}
          </CardDescription>
        </div>
        <Button onClick={() => setIsAddingType(true)} disabled={isAddingType}>
          <Plus className="h-4 w-4 me-2" />
          {t("contractors.gatePasses.addPassType", "Add Pass Type")}
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">
                {t("contractors.gatePasses.code", "Code")}
              </TableHead>
              <TableHead className="w-[180px]">
                {t("contractors.gatePasses.passTypeName", "Name")}
              </TableHead>
              <TableHead className="w-[180px]">
                {t("contractors.gatePasses.passTypeNameAr", "Name (Arabic)")}
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
            {isAddingType && (
              <TableRow>
                <TableCell>
                  <Input
                    value={newPassType.code}
                    onChange={(e) => setNewPassType({ ...newPassType, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="e.g., material_in"
                    className="h-9"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newPassType.name}
                    onChange={(e) => setNewPassType({ ...newPassType, name: e.target.value })}
                    placeholder="e.g., Material In"
                    className="h-9"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={newPassType.name_ar}
                    onChange={(e) => setNewPassType({ ...newPassType, name_ar: e.target.value })}
                    placeholder="e.g., دخول مواد"
                    className="h-9"
                    dir="rtl"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={newPassType.allowed_scope}
                    onValueChange={(value: PassTypeScope) =>
                      setNewPassType({ ...newPassType, allowed_scope: value })
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
                    checked={newPassType.is_active}
                    onCheckedChange={(checked) => setNewPassType({ ...newPassType, is_active: checked })}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-green-600"
                      onClick={handleAddNewType}
                      disabled={!newPassType.code || !newPassType.name}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setIsAddingType(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {isLoadingTypes ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t("common.loading", "Loading...")}
                </TableCell>
              </TableRow>
            ) : passTypes.length === 0 && !isAddingType ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t("contractors.gatePasses.noPassTypes", "No pass types configured. Add one to get started.")}
                </TableCell>
              </TableRow>
            ) : (
              passTypes.map((passType) => (
                <TableRow key={passType.id}>
                  {editingType?.id === passType.id ? (
                    <>
                      <TableCell>
                        <Input
                          value={editingType.code}
                          onChange={(e) => setEditingType({ ...editingType, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editingType.name}
                          onChange={(e) => setEditingType({ ...editingType, name: e.target.value })}
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editingType.name_ar}
                          onChange={(e) => setEditingType({ ...editingType, name_ar: e.target.value })}
                          className="h-9"
                          dir="rtl"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={editingType.allowed_scope}
                          onValueChange={(value: PassTypeScope) =>
                            setEditingType({ ...editingType, allowed_scope: value })
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
                          checked={editingType.is_active}
                          onCheckedChange={(checked) => setEditingType({ ...editingType, is_active: checked })}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-green-600"
                            onClick={handleSaveEditType}
                            disabled={!editingType.code || !editingType.name}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={handleCancelEditType}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {passType.code}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">
                        {passType.name}
                      </TableCell>
                      <TableCell dir="rtl" className="text-muted-foreground">
                        {passType.name_ar || "-"}
                      </TableCell>
                      <TableCell>
                        {getScopeBadge(passType.allowed_scope, t)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={passType.is_active}
                          onCheckedChange={() => handleToggleTypeActive(passType)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleStartEditType(passType)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteTypeId(passType.id)}
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
    </Card>);
}
