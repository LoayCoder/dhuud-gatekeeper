import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StatusDot } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { ActionListTable, type ActionListColumn } from '../ActionListTable';
import { useMyInspectionActions } from '@/features/incidents';
import type { InspectionAction } from '@/features/incidents/hooks/use-inspection-actions/types';
import { cn } from '@/lib/utils';

const STATUS_MAP: Record<string, 'completed' | 'pending' | 'critical' | 'informational' | 'neutral'> = {
  completed: 'completed',
  verified: 'completed',
  in_progress: 'informational',
  pending: 'pending',
  overdue: 'critical',
};

interface InspectionActionsListProps {
  sourceType?: 'inspection' | 'audit';
}

export function InspectionActionsList({ sourceType }: InspectionActionsListProps = {}) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: actions, isLoading } = useMyInspectionActions(sourceType);

  const openActions = (actions || []).filter(
    (a) => a.status !== 'completed' && a.status !== 'verified' && a.status !== 'closed'
  );

  const items = openActions.map((a) => ({
    id: a.id,
    title: a.title,
    status: a.status,
    priority: a.priority,
    reference_id: a.reference_id ?? null,
    due_date: a.due_date ?? null,
    session_id: (a as any).session_id as string | null,
    session_type: (a as any).session?.session_type ?? null,
    _isOverdue: a.due_date ? new Date(a.due_date) < new Date() : false,
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
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 text-xs">
          <StatusDot status={item._isOverdue ? 'critical' : (STATUS_MAP[item.status] || 'pending')} size="sm" />
          <span className="capitalize">
            {item._isOverdue ? t('actions.overdue', 'Overdue') : item.status?.replace(/_/g, ' ') || '—'}
          </span>
        </span>
      ),
    },
    {
      key: 'priority',
      label: t('actionCenter.columns.priority', 'Priority'),
      sortable: true,
      render: (item) => (
        <Badge variant="outline" className="text-[10px] capitalize">
          {item.priority}
        </Badge>
      ),
    },
    {
      key: 'due_date',
      label: t('actionCenter.columns.dueDate', 'Due Date'),
      sortable: true,
      expandable: true,
      render: (item) => (
        <span className={cn('inline-flex items-center gap-1 text-xs', item._isOverdue && 'text-destructive font-medium')}>
          <Calendar className="h-3 w-3" />
          {item.due_date
            ? new Date(item.due_date).toLocaleDateString(
                i18n.language === 'ar' ? 'ar-SA' : 'en-US',
                { month: 'short', day: 'numeric' }
              )
            : '—'}
        </span>
      ),
    },
  ];

  return (
    <ActionListTable<RowItem>
      items={items as unknown as RowItem[]}
      columns={columns}
      isLoading={isLoading}
      onRowClick={(item) => {
        if (item.session_id) {
          const st = item.session_type || (sourceType === 'audit' ? 'audit' : 'asset');
          const suffix = st === 'area' ? '/area' : st === 'audit' ? '/audit' : '';
          navigate(`/inspections/sessions/${item.session_id}${suffix}`);
        }
      }}
      emptyMessage={t('actionCenter.sheet.noInspectionActions', 'No open inspection actions')}
      searchableFields={['reference_id', 'title', 'status', 'priority']}
    />
  );
}
