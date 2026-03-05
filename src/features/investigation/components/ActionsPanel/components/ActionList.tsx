import React from "react";
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
                            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
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
                      {String(t(`investigation.actions.statuses.${action.status || 'assigned'}`, action.status || 'assigned'))}
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
