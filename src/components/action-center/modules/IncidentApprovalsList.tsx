import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
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
    assigned_role: t('actionCenter.roles.approver', 'Approver'),
  }));

  type RowItem = typeof items[number];

  const columns: ActionListColumn<RowItem>[] = [
    {
      key: 'reference_id',
      label: t('actionCenter.columns.referenceId', 'Reference'),
      sortable: true,
      render: (item) => (
        <span className="font-mono text-xs">{item.reference_id || '—'}</span>
      ),
    },
    {
      key: 'title',
      label: t('actionCenter.columns.title', 'Title'),
      sortable: true,
      render: (item) => (
        <span className="line-clamp-1 max-w-[200px]">{item.title}</span>
      ),
    },
    {
      key: 'status',
      label: t('actionCenter.columns.status', 'Status'),
      sortable: true,
      render: (item) => (
        <Badge variant="outline" className="text-[10px]">
          {item.status?.replace(/_/g, ' ') || '—'}
        </Badge>
      ),
    },
    {
      key: 'assigned_role',
      label: t('actionCenter.columns.assignedRole', 'Role'),
      sortable: false,
      hideOnMobile: true,
      render: (item) => (
        <Badge variant="secondary" className="text-[10px]">
          {item.assigned_role}
        </Badge>
      ),
    },
    {
      key: 'severity',
      label: t('actionCenter.columns.severity', 'Severity'),
      sortable: true,
      hideOnMobile: true,
      render: (item) => (
        <Badge variant="outline" className="text-[10px] capitalize">
          {item.severity || '—'}
        </Badge>
      ),
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
