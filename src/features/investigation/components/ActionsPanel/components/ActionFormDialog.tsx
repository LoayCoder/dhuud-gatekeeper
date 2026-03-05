import React from "react";
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

export function ActionFormDialog({ state }: { state: unknown }) {
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
                            {causesForSelection.filter((cause: unknown) => cause.id).map((cause: unknown, idx: number) => (
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
                        {departments?.map((dept: unknown) => (
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
                        {usersForAssignment?.map((user: unknown) => (
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
