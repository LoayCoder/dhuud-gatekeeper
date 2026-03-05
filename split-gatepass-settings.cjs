const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'src/pages/contractors/GatePassSettings.tsx');
let content = fs.readFileSync(sourceFile, 'utf8');

const targetDir = path.join(__dirname, 'src/pages/contractors/GatePassSettings');
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

const hooksDir = path.join(targetDir, 'hooks');
if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });

const componentsDir = path.join(targetDir, 'components');
if (!fs.existsSync(componentsDir)) fs.mkdirSync(componentsDir, { recursive: true });

function extractBetween(str, startStr, endStr) {
    const startIdx = str.indexOf(startStr);
    if (startIdx === -1) return '';
    const restStr = str.substring(startIdx + startStr.length);
    const endIdx = restStr.indexOf(endStr);
    if (endIdx === -1) return restStr;
    return restStr.substring(0, endIdx);
}

// 1. types.ts
const typesContent = `import { PassTypeScope } from "@/hooks/contractor-management/use-gate-pass-types";

export type ApproverScope = "external" | "internal" | "both";

export interface EditingApprover {
  id: string | null;
  user_id: string;
  approver_scope: ApproverScope;
  is_active: boolean;
}

export interface EditingPassType {
  id: string | null;
  code: string;
  name: string;
  name_ar: string;
  allowed_scope: PassTypeScope;
  is_active: boolean;
}
`;
fs.writeFileSync(path.join(targetDir, 'types.ts'), typesContent);

// 2. utils.tsx
const utilsContent = `import React from "react";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Globe } from "lucide-react";
import { ApproverScope } from "./types";

export const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const getScopeBadge = (scope: ApproverScope, t: (key: string, fallback: string) => string) => {
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
`;
fs.writeFileSync(path.join(targetDir, 'utils.tsx'), utilsContent);

// 3. hooks/useGatePassSettings.ts
const hookImports = `import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAllGatePassApprovers,
  useCreateGatePassApprover,
  useUpdateGatePassApprover,
  useDeleteGatePassApprover,
  GatePassApprover,
} from "@/hooks/contractor-management/use-gate-pass-approvers";
import {
  useAllGatePassTypes,
  useCreateGatePassType,
  useUpdateGatePassType,
  useDeleteGatePassType,
  GatePassType,
} from "@/hooks/contractor-management/use-gate-pass-types";
import { EditingApprover, EditingPassType } from "../types";

export function useGatePassSettings() {
`;

const hookBodyTemp = extractBetween(content, 'const GatePassSettings = () => {', '  return (');

const hookBottom = `
  return {
    t,
    approvers, isLoading, editing, setEditing,
    isAdding, setIsAdding, deleteId, setDeleteId, newApprover, setNewApprover,
    handleStartEdit, handleSaveEdit, handleCancelEdit, handleAddNew, handleDelete, handleToggleActive,
    
    passTypes, isLoadingTypes, editingType, setEditingType,
    isAddingType, setIsAddingType, deleteTypeId, setDeleteTypeId, newPassType, setNewPassType,
    handleStartEditType, handleSaveEditType, handleCancelEditType, handleAddNewType, handleDeleteType, handleToggleTypeActive
  };
}
`;
fs.writeFileSync(path.join(hooksDir, 'useGatePassSettings.ts'), hookImports + hookBodyTemp + hookBottom);

// 4. components/ApproversSettingsCard.tsx
const approversCardImports = `import React from "react";
import { Plus, Pencil, Trash2, Check, X, Building2, Users, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserSearchCombobox } from "@/components/admin/UserSearchCombobox";
import { getInitials, getScopeBadge } from "../utils";
import { ApproverScope } from "../types";

export function ApproversSettingsCard({ state }: { state: any }) {
  const { 
    t, 
    isAdding, setIsAdding, newApprover, setNewApprover, handleAddNew,
    isLoading, approvers, editing, setEditing, handleSaveEdit, handleCancelEdit, 
    handleStartEdit, handleToggleActive, setDeleteId 
  } = state;

  return (
`;
const approversCardJSX = extractBetween(content, '      <Card>', '      {/* Pass Type Control Card */}');
fs.writeFileSync(path.join(componentsDir, 'ApproversSettingsCard.tsx'), approversCardImports + "      <Card>\n" + approversCardJSX + "  );\n}\n");

// 5. components/PassTypeSettingsCard.tsx
const passTypesCardImports = `import React from "react";
import { Plus, Pencil, Trash2, Check, X, Building2, Users, Globe, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getScopeBadge } from "../utils";
import { PassTypeScope } from "@/hooks/contractor-management/use-gate-pass-types";

export function PassTypeSettingsCard({ state }: { state: any }) {
  const { 
    t, 
    isAddingType, setIsAddingType, newPassType, setNewPassType, handleAddNewType,
    isLoadingTypes, passTypes, editingType, setEditingType, handleSaveEditType, handleCancelEditType, 
    handleStartEditType, handleToggleTypeActive, setDeleteTypeId 
  } = state;

  return (
`;
const passTypesCardJSX = extractBetween(content, '      {/* Pass Type Control Card */}', '      {/* Delete Approver Dialog */}');
fs.writeFileSync(path.join(componentsDir, 'PassTypeSettingsCard.tsx'), passTypesCardImports + "      {/* Pass Type Control Card */}\n" + passTypesCardJSX + "  );\n}\n");

// 6. GatePassSettings.tsx (shell)
const shellContent = `import React from "react";
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
`;
fs.writeFileSync(path.join(targetDir, 'GatePassSettings.tsx'), shellContent);
fs.writeFileSync(path.join(targetDir, 'index.tsx'), "export { default } from './GatePassSettings';\nexport * from './types';\n");

console.log('GatePassSettings split successfully');
