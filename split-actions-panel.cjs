const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'src/components/investigation/ActionsPanel.tsx');
let content = fs.readFileSync(sourceFile, 'utf8');

const targetDir = path.join(__dirname, 'src/components/investigation/ActionsPanel');
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
    if (endIdx === -1) return '';
    return restStr.substring(0, endIdx);
}

// 1. types.ts
const typesContent = `import { z } from "zod";

export interface RootCause {
  id: string;
  text: string;
}

export interface ContributingFactor {
  id: string;
  text: string;
}

export const actionSchema = z.object({
  title: z.string().min(3, 'Title is required (min 3 characters)'),
  description: z.string().min(10, 'Description is required (min 10 characters)'),
  responsible_department_id: z.string().min(1, 'Department is required'),
  assigned_to: z.string().min(1, 'Assignee is required'),
  start_date: z.string().min(1, 'Start date is required'),
  due_date: z.string().min(1, 'Due date is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  action_type: z.enum(['corrective', 'preventive', 'improvement']),
  category: z.enum(['engineering', 'administrative', 'ppe', 'training', 'procedure_update']),
  linked_cause_type: z.enum(['root_cause', 'contributing_factor']).optional().nullable(),
  linked_root_cause_id: z.string().optional().nullable(),
}).refine((data) => {
  if (data.start_date && data.due_date) {
    return new Date(data.start_date) <= new Date(data.due_date);
  }
  return true;
}, { message: 'Start date must be before due date', path: ['due_date'] });

export type ActionFormValues = z.infer<typeof actionSchema>;

export interface ActionsPanelProps {
  incidentId: string;
  incidentStatus?: string | null;
  canEdit?: boolean;
  onActionChange?: () => void;
  openDialogTrigger?: boolean;
  onDialogTriggered?: () => void;
}
`;
fs.writeFileSync(path.join(targetDir, 'types.ts'), typesContent);

// 2. hooks/useActionsPanelState.ts
const stateHookImports = `import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCorrectiveActions, useCreateCorrectiveAction, useUpdateCorrectiveAction, useDeleteCorrectiveAction, CorrectiveAction } from "@/hooks/use-investigation";
import { useInvestigation } from "@/hooks/use-investigation";
import { useDepartmentsByBranch } from "@/hooks/use-departments-by-site";
import { useDepartmentUsers, useTenantUsers } from "@/hooks/use-department-users";
import { useRCAAI } from "@/hooks/use-rca-ai";
import { useIncident } from "@/hooks/use-incidents";
import { toast } from "sonner";
import { ActionsPanelProps, actionSchema, ActionFormValues, RootCause, ContributingFactor } from "../types";

export function useActionsPanelState({
  incidentId,
  incidentStatus,
  canEdit: canEditProp,
  onActionChange,
  openDialogTrigger,
  onDialogTriggered
}: ActionsPanelProps) {
`;

const stateHookBody = extractBetween(content, "  const { t, i18n } = useTranslation();", "  if (isLoading) {");
const stateHookBottom = `
  return {
    t, direction, isLocked,
    dialogOpen, setDialogOpen,
    expandedActions, setExpandedActions,
    selectedDepartmentId, setSelectedDepartmentId,
    isAISuggesting, setIsAISuggesting,
    editingAction, setEditingAction,
    deleteConfirmId, setDeleteConfirmId,
    
    actions, isLoading, investigation, incident,
    departments, departmentUsers, allUsers,
    createAction, updateAction, deleteAction,
    
    rootCauses, contributingFactors, form,
    selectedCauseType, selectedCauseId, causesForSelection, selectedCause, usersForAssignment,
    
    handleAISuggestAction, onSubmit, handleCloseDialog,
    handleEditAction, handleDeleteAction, toggleActionExpand,
    getStatusIcon, getPriorityVariant, getCategoryLabel,
    getLinkedCauseText, getLinkedCauseLabel
  };
}
`;
fs.writeFileSync(path.join(hooksDir, 'useActionsPanelState.tsx'), stateHookImports + "  const { t, i18n } = useTranslation();" + stateHookBody + stateHookBottom);

// 3. components/ActionFormDialog.tsx
const formDialogContent = `import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Link2, Sparkles, Building2, User } from "lucide-react";

export function ActionFormDialog({ state }: { state: any }) {
  const { t } = useTranslation();
  const {
    direction, isLocked, dialogOpen, setDialogOpen,
    editingAction, setEditingAction, form,
    rootCauses, contributingFactors,
    selectedCauseType, causesForSelection, selectedCause,
    isAISuggesting, handleAISuggestAction,
    departments, setSelectedDepartmentId, usersForAssignment,
    handleCloseDialog, onSubmit, createAction, updateAction
  } = state;

  if (isLocked) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      if (!open) handleCloseDialog();
      else setDialogOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button onClick={() => { setEditingAction(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 me-2" />
          {t('investigation.actions.addAction', 'Add Action')}
        </Button>
      </DialogTrigger>
      <DialogContent dir={direction} className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingAction 
              ? t('investigation.actions.editAction', 'Edit Corrective Action')
              : t('investigation.actions.newAction', 'New Corrective Action')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* STEP 1: Link to Cause (AT TOP) */}
            {(rootCauses.length > 0 || contributingFactors.length > 0) && (
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="linked_cause_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        {t('investigation.actions.linkedCauseType', 'Link to Cause')} *
                      </FormLabel>
                      <Select 
                        onValueChange={(val) => {
                          field.onChange(val);
                          form.setValue('linked_root_cause_id', '');
                        }} 
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('investigation.actions.selectCauseType', 'Select cause type...')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent dir={direction}>
                          {rootCauses.length > 0 && (
                            <SelectItem value="root_cause">{t('investigation.rca.rootCause', 'Root Cause')}</SelectItem>
                          )}
                          {contributingFactors.length > 0 && (
                            <SelectItem value="contributing_factor">{t('investigation.rca.contributingFactor', 'Contributing Factor')}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedCauseType && causesForSelection.length > 0 && (
                  <FormField
                    control={form.control}
                    name="linked_root_cause_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {selectedCauseType === 'root_cause' 
                            ? t('investigation.actions.selectRootCause', 'Select Root Cause')
                            : t('investigation.actions.selectContributingFactor', 'Select Contributing Factor')} *
                        </FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(val)} 
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('investigation.actions.selectCause', 'Select cause...')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent dir={direction}>
                            {causesForSelection.filter((cause: any) => cause.id).map((cause: any, idx: number) => (
                              <SelectItem key={cause.id} value={cause.id}>
                                {idx + 1}: {cause.text.length > 50 ? cause.text.substring(0, 50) + '...' : cause.text}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* STEP 2: Selected Cause Preview with AI Suggest */}
            {selectedCause && (
              <Card className="bg-muted/50 border-dashed">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Link2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-xs">
                          {selectedCauseType === 'root_cause' 
                            ? t('investigation.rca.rootCause', 'Root Cause')
                            : t('investigation.rca.contributingFactor', 'Contributing Factor')}
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={handleAISuggestAction}
                          disabled={isAISuggesting}
                        >
                          {isAISuggesting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          {t('investigation.actions.ai.suggestAction', 'AI Suggest Action')}
                        </Button>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">
                        {selectedCause.text}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 3: Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.actions.actionTitle', 'Action Title')} *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('investigation.actions.titlePlaceholder', 'Enter action title...')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* STEP 4: Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('investigation.actions.description', 'Description')} *</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder={t('investigation.actions.descriptionPlaceholder', 'Enter description (min 10 characters)...')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('investigation.actions.category', 'Category')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent dir={direction}>
                        <SelectItem value="engineering">{t('investigation.actions.categories.engineering', 'Engineering')}</SelectItem>
                        <SelectItem value="administrative">{t('investigation.actions.categories.administrative', 'Administrative')}</SelectItem>
                        <SelectItem value="ppe">{t('investigation.actions.categories.ppe', 'PPE')}</SelectItem>
                        <SelectItem value="training">{t('investigation.actions.categories.training', 'Training')}</SelectItem>
                        <SelectItem value="procedure_update">{t('investigation.actions.categories.procedureUpdate', 'Procedure Update')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="action_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('investigation.actions.type', 'Type')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent dir={direction}>
                        <SelectItem value="corrective">{t('investigation.actions.types.corrective', 'Corrective')}</SelectItem>
                        <SelectItem value="preventive">{t('investigation.actions.types.preventive', 'Preventive')}</SelectItem>
                        <SelectItem value="improvement">{t('investigation.actions.types.improvement', 'Improvement')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('investigation.actions.priority', 'Priority')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent dir={direction}>
                        <SelectItem value="low">{t('incidents.severityLevels.low', 'Low')}</SelectItem>
                        <SelectItem value="medium">{t('incidents.severityLevels.medium', 'Medium')}</SelectItem>
                        <SelectItem value="high">{t('incidents.severityLevels.high', 'High')}</SelectItem>
                        <SelectItem value="critical">{t('incidents.severityLevels.critical', 'Critical')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('investigation.actions.startDate', 'Start Date')} *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('investigation.actions.dueDate', 'Due Date')} *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="responsible_department_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {t('investigation.actions.department', 'Department')} *
                    </FormLabel>
                    <Select 
                      onValueChange={(val) => {
                        field.onChange(val);
                        setSelectedDepartmentId(val || null);
                        form.setValue('assigned_to', '');
                      }} 
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('investigation.actions.selectDepartment', 'Select department...')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent dir={direction}>
                        {departments?.map((dept: any) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assigned_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t('investigation.actions.assignedTo', 'Assigned To')} *
                    </FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val)} 
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('investigation.actions.selectAssignee', 'Select assignee...')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent dir={direction}>
                        {usersForAssignment?.map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.employee_id || 'Unknown'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={createAction.isPending || updateAction.isPending}>
                {(createAction.isPending || updateAction.isPending) && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {editingAction ? t('common.save', 'Save') : t('common.create', 'Create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
`;
fs.writeFileSync(path.join(componentsDir, 'ActionFormDialog.tsx'), formDialogContent);

// 4. components/ActionList.tsx
const actionListContent = `import React from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Link2, Building2, User, Pencil, Trash2 } from "lucide-react";

// The ActionEvidenceSection is in the parent directory of ActionsPanel
import { ActionEvidenceSection } from "../../ActionEvidenceSection";

export function ActionList({ state, incidentId }: { state: any, incidentId: string }) {
  const { t } = useTranslation();
  const {
    actions, isLocked, expandedActions, toggleActionExpand,
    getStatusIcon, getPriorityVariant, getCategoryLabel,
    getLinkedCauseText, getLinkedCauseLabel,
    handleEditAction, setDeleteConfirmId
  } = state;

  if (actions?.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>{t('investigation.actions.noActions', 'No corrective actions have been created yet.')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {actions?.map((action: any) => {
        const actionData = action as unknown as { 
          reference_id: string | null;
          linked_root_cause_id: string | null;
          linked_cause_type: string | null;
          category: string | null;
          start_date: string | null;
        };
        const linkedCauseText = getLinkedCauseText(actionData.linked_root_cause_id, actionData.linked_cause_type);
        const linkedCauseLabel = getLinkedCauseLabel(actionData.linked_cause_type);
        const category = actionData.category;
        const startDate = actionData.start_date;
        const isExpanded = expandedActions.has(action.id);

        return (
          <Card key={action.id}>
            <Collapsible open={isExpanded} onOpenChange={() => toggleActionExpand(action.id)}>
              <CardContent className="pt-4 min-w-0 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {getStatusIcon(action.status)}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {actionData.reference_id && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {actionData.reference_id}
                          </Badge>
                        )}
                        <h4 className="font-medium truncate">{action.title}</h4>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <ChevronDown className={\`h-4 w-4 transition-transform \${isExpanded ? 'rotate-180' : ''}\`} />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      {action.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{action.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant={getPriorityVariant(action.priority)}>
                          {action.priority}
                        </Badge>
                        <Badge variant="outline">
                          {action.action_type}
                        </Badge>
                        {category && (
                          <Badge variant="secondary">
                            {getCategoryLabel(category)}
                          </Badge>
                        )}
                        {startDate && (
                          <Badge variant="outline" className="text-xs">
                            {t('investigation.actions.start', 'Start')}: {format(new Date(startDate), 'MMM d')}
                          </Badge>
                        )}
                        {action.due_date && (
                          <Badge variant="outline" className="text-xs">
                            {t('investigation.actions.due', 'Due')}: {format(new Date(action.due_date), 'MMM d, yyyy')}
                          </Badge>
                        )}
                      </div>
                      {linkedCauseText && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Link2 className="h-3 w-3" />
                          <Badge variant="outline" className="text-xs">{linkedCauseLabel}</Badge>
                          <span className="truncate">{linkedCauseText}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {action.assignee?.full_name && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{action.assignee.full_name}</span>
                          </div>
                        )}
                        {action.department?.name && (
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>{action.department.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {!isLocked && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditAction(action)}
                          title={t('common.edit', 'Edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(action.id)}
                          title={t('common.delete', 'Delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Badge 
                      variant={action.status === 'verified' ? 'default' : action.status === 'completed' ? 'secondary' : 'outline'}
                      className={
                        action.status === 'verified' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : action.status === 'completed'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          : ''
                      }
                    >
                      {t(\`investigation.actions.statuses.\${action.status || 'assigned'}\`, action.status || 'assigned')}
                    </Badge>
                  </div>
                </div>

                <CollapsibleContent className="mt-4 pt-4 border-t">
                  <ActionEvidenceSection
                    actionId={action.id}
                    incidentId={incidentId}
                    isReadOnly={isLocked || action.status === 'verified'}
                  />
                </CollapsibleContent>
              </CardContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}
`;
fs.writeFileSync(path.join(componentsDir, 'ActionList.tsx'), actionListContent);

// 5. ActionsPanel.tsx (shell)
const shellContent = `import React from "react";
import { Loader2, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ActionsPanelProps } from "./types";
import { useActionsPanelState } from "./hooks/useActionsPanelState";
import { ActionFormDialog } from "./components/ActionFormDialog";
import { ActionList } from "./components/ActionList";

export default function ActionsPanel(props: ActionsPanelProps) {
  const state = useActionsPanelState(props);
  const {
    t, direction, isLocked, isLoading, incidentStatus,
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
`;
fs.writeFileSync(path.join(targetDir, 'ActionsPanel.tsx'), shellContent);
fs.writeFileSync(path.join(targetDir, 'index.tsx'), "export { default } from './ActionsPanel';\nexport * from './types';\n");

console.log('ActionsPanel split successfully');
