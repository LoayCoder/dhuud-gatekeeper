import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/ui/status-badge';
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
    assigned_role: t('actionCenter.roles.investigator', 'Investigator'),
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
          <StatusDot status="informational" size="sm" />
          <span className="capitalize">{item.status?.replace(/_/g, ' ') || '—'}</span>
        </span>
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
      key: 'severity_v2',
      label: t('actionCenter.columns.severity', 'Severity'),
      sortable: true,
      hideOnMobile: true,
      render: (item) => {
        if (!item.severity_v2) return null;
        return (
          <Badge variant="outline" className="text-[10px] capitalize">
            {item.severity_v2.replace('_', ' ')}
          </Badge>
        );
      },
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
