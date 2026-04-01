import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusDot } from '@/components/ui/status-badge';
import { User, Calendar, AlertTriangle } from 'lucide-react';
import { ActionListTable, type ActionListColumn } from '../ActionListTable';
import { usePendingActionApprovals } from '@/hooks/use-pending-approvals';
import type { PendingActionApproval } from '@/hooks/use-pending-approvals';
import { ActionDetailSheet } from '@/pages/incidents/MyActions/ActionDetailSheet';
import { cn } from '@/lib/utils';

export function InspectionApprovalsList() {
  const { t, i18n } = useTranslation();
  const { data: allActions, isLoading } = usePendingActionApprovals();
  const [selectedAction, setSelectedAction] = useState<PendingActionApproval | null>(null);

  // Filter to inspection-sourced actions only (session_id is not null)
  const inspectionActions = (allActions || []).filter((a) => a.session_id != null);

  const items = inspectionActions.map((a) => ({
    ...a,
    assignee_name: a.assigned_user?.full_name || '—',
    dept_name: a.department?.name || '—',
  }));

  type RowItem = typeof items[number];

  const columns: ActionListColumn<RowItem>[] = [
    {
      key: 'title',
      label: t('actionCenter.columns.title', 'Title'),
      sortable: true,
      primary: true,
      render: (item) => (
        <div className="flex flex-col gap-0.5">
          <span className="line-clamp-2 font-medium">{item.title}</span>
          {item.reference_id && (
            <span className="font-mono text-[10px] text-muted-foreground">{item.reference_id}</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: t('actionCenter.columns.status', 'Status'),
      sortable: true,
      render: () => (
        <span className="inline-flex items-center gap-1.5 text-xs">
          <StatusDot status="pending" size="sm" />
          <span>{t('actions.pendingVerification', 'Pending Verification')}</span>
        </span>
      ),
    },
    {
      key: 'assignee_name',
      label: t('actionCenter.columns.assignee', 'Assignee'),
      sortable: true,
      expandable: true,
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[120px]">{item.assignee_name}</span>
        </span>
      ),
    },
    {
      key: 'due_date',
      label: t('actionCenter.columns.dueDate', 'Due Date'),
      sortable: true,
      expandable: true,
      render: (item) => {
        const isOverdue = item.due_date ? new Date(item.due_date) < new Date() : false;
        return (
          <span className={cn('inline-flex items-center gap-1 text-xs', isOverdue && 'text-destructive font-medium')}>
            <Calendar className="h-3 w-3" />
            {item.due_date
              ? new Date(item.due_date).toLocaleDateString(
                  i18n.language === 'ar' ? 'ar-SA' : 'en-US',
                  { month: 'short', day: 'numeric' }
                )
              : '—'}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <ActionListTable<RowItem>
        items={items}
        columns={columns}
        isLoading={isLoading}
        onRowClick={(item) => setSelectedAction(item)}
        emptyMessage={t('actionCenter.sheet.noInspectionApprovals', 'No inspection actions pending verification')}
        searchableFields={['reference_id', 'title', 'assignee_name']}
      />

      {selectedAction && (
        <ActionDetailSheet
          action={{
            id: selectedAction.id,
            title: selectedAction.title,
            description: selectedAction.description,
            status: selectedAction.status,
            priority: selectedAction.priority,
            due_date: selectedAction.due_date,
            incident_id: selectedAction.incident_id,
            assigned_to: selectedAction.assigned_to,
            reference_id: selectedAction.reference_id,
            created_at: selectedAction.created_at,
            completion_notes: selectedAction.completion_notes,
          }}
          open={!!selectedAction}
          onOpenChange={(open) => { if (!open) setSelectedAction(null); }}
        />
      )}
    </>
  );
}
