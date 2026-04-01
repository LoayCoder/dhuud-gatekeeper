import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StatusDot } from '@/components/ui/status-badge';
import { User, ShieldAlert } from 'lucide-react';
import { ActionListTable, type ActionListColumn } from '../ActionListTable';
import { usePendingIncidentApprovals } from '@/hooks/use-pending-approvals';
import type { PendingIncidentApproval } from '@/hooks/use-pending-approvals';
import { getCurrentOwner } from '@/lib/current-owner';

function resolveActionBy(item: PendingIncidentApproval): string {
  const owner = getCurrentOwner({ status: item.status as any, approval_manager: item.approval_manager } as any);
  if (owner?.name) return owner.name;
  if (item.approval_manager?.full_name) return item.approval_manager.full_name;
  if (owner?.role) return owner.role;
  return '—';
}

interface IncidentApprovalsListProps {
  eventTypeFilter?: 'incident' | 'observation';
}

export function IncidentApprovalsList({ eventTypeFilter }: IncidentApprovalsListProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: approvals, isLoading } = usePendingIncidentApprovals();

  const filtered = eventTypeFilter
    ? (approvals || []).filter((a) => a.event_type === eventTypeFilter)
    : (approvals || []);

  const items = filtered.map((a) => ({
    ...a,
    reporter_name: a.reporter?.full_name || '—',
    action_by_name: resolveActionBy(a),
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
          <div className="flex items-center gap-1.5">
            <span className="line-clamp-2 font-medium">{item.title}</span>
            {item.isAdminOverride && (
              <span className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning whitespace-nowrap">
                <ShieldAlert className="h-3 w-3 shrink-0" />
                {t('actionCenter.adminOverride', 'Admin Override')}
              </span>
            )}
          </div>
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
          <StatusDot status="pending" size="sm" />
          <span className="capitalize">{item.status?.replace(/_/g, ' ') || '—'}</span>
        </span>
      ),
    },
    {
      key: 'reporter_name',
      label: t('actionCenter.columns.reportedBy', 'Reported By'),
      sortable: true,
      expandable: true,
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[120px]">{item.reporter_name}</span>
        </span>
      ),
    },
    {
      key: 'action_by_name',
      label: t('actionCenter.columns.actionBy', 'Action By'),
      sortable: true,
      expandable: true,
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[120px]">{item.action_by_name}</span>
        </span>
      ),
    },
    {
      key: 'created_at',
      label: t('actionCenter.columns.createdDate', 'Created'),
      sortable: true,
      expandable: true,
      render: (item) =>
        item.created_at
          ? new Date(item.created_at).toLocaleDateString(
              i18n.language === 'ar' ? 'ar-SA' : 'en-US',
              { month: 'short', day: 'numeric' }
            )
          : '—',
    },
  ];

  return (
    <ActionListTable<RowItem>
      items={items}
      columns={columns}
      isLoading={isLoading}
      onRowClick={(item) => navigate(`/incidents/${item.id}`)}
      emptyMessage={t('actionCenter.sheet.noApprovals', 'No pending approvals')}
      searchableFields={['reference_id', 'title', 'status', 'reporter_name', 'action_by_name']}
    />
  );
}
