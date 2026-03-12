import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/ui/status-badge';
import { User } from 'lucide-react';
import { ActionListTable, type ActionListColumn } from '../ActionListTable';
import { usePendingIncidentApprovals } from '@/hooks/use-pending-approvals';
import type { PendingIncidentApproval } from '@/hooks/use-pending-approvals';

export function IncidentApprovalsList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: approvals, isLoading } = usePendingIncidentApprovals();

  const items = (approvals || []).map((a) => ({
    ...a,
    reporter_name: a.reporter?.full_name || '—',
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
          <StatusDot status="pending" size="sm" />
          <span className="capitalize">{item.status?.replace(/_/g, ' ') || '—'}</span>
        </span>
      ),
    },
    {
      key: 'reporter_name',
      label: t('actionCenter.columns.reportedBy', 'Reported By'),
      sortable: true,
      hideOnMobile: true,
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[120px]">{item.reporter_name}</span>
        </span>
      ),
    },
    {
      key: 'severity',
      label: t('actionCenter.columns.severity', 'Severity'),
      sortable: true,
      hideOnMobile: true,
      render: (item) => {
        if (!item.severity) return null;
        return (
          <Badge variant="outline" className="text-[10px] capitalize">
            {item.severity}
          </Badge>
        );
      },
    },
    {
      key: 'created_at',
      label: t('actionCenter.columns.createdDate', 'Created'),
      sortable: true,
      hideOnMobile: true,
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
      searchableFields={['reference_id', 'title', 'status', 'severity', 'reporter_name']}
    />
  );
}
