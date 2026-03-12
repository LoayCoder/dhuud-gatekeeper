import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { ActionListTable, type ActionListColumn } from '../ActionListTable';
import { useMyAssignedInvestigations } from '@/hooks/use-my-workflow-tasks';
import type { MyAssignedInvestigation } from '@/hooks/use-my-workflow-tasks';

export function IncidentInvestigationsList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: investigations, isLoading } = useMyAssignedInvestigations();

  const items = (investigations || []).map((inv) => ({
    id: inv.id,
    incident_id: inv.incident_id,
    reference_id: inv.incident?.reference_id || null,
    title: inv.incident?.title || '—',
    status: inv.incident?.status || null,
    severity_v2: inv.incident?.severity_v2 || null,
    assigned_at: inv.assigned_at,
    target_completion_date: inv.target_completion_date,
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
      key: 'severity_v2',
      label: t('actionCenter.columns.severity', 'Severity'),
      sortable: true,
      hideOnMobile: true,
      render: (item) => (
        <Badge variant="outline" className="text-[10px] capitalize">
          {item.severity_v2?.replace('_', ' ') || '—'}
        </Badge>
      ),
    },
    {
      key: 'target_completion_date',
      label: t('actionCenter.columns.targetDate', 'Target Date'),
      sortable: true,
      hideOnMobile: true,
      render: (item) =>
        item.target_completion_date
          ? new Date(item.target_completion_date).toLocaleDateString(
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
      onRowClick={(item) => navigate(`/incidents/${item.incident_id}`)}
      emptyMessage={t('actionCenter.sheet.noInvestigations', 'No active investigations assigned to you')}
      searchableFields={['reference_id', 'title', 'status', 'severity_v2']}
    />
  );
}
