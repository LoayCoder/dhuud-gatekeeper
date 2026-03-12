import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StatusDot } from '@/components/ui/status-badge';
import { User } from 'lucide-react';
import { ActionListTable, type ActionListColumn } from '../ActionListTable';
import { useMyAssignedInvestigations } from '@/hooks/use-my-workflow-tasks';
import type { MyAssignedInvestigation } from '@/hooks/use-my-workflow-tasks';
import { getCurrentOwner } from '@/lib/current-owner';

function resolveActionBy(inv: MyAssignedInvestigation): string {
  if (!inv.incident) return '—';
  const owner = getCurrentOwner({
    status: inv.incident.status as any,
    approval_manager: inv.incident.approval_manager as any,
    investigations: [{ investigator: { full_name: null } }],
  } as any);
  if (owner?.name) return owner.name;
  if (inv.incident.approval_manager?.full_name) return inv.incident.approval_manager.full_name;
  if (owner?.role) return owner.role;
  return '—';
}

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
    assigned_at: inv.assigned_at,
    target_completion_date: inv.target_completion_date,
    reporter_name: inv.incident?.reporter?.full_name || '—',
    action_by_name: resolveActionBy(inv),
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
      key: 'target_completion_date',
      label: t('actionCenter.columns.targetDate', 'Target Date'),
      sortable: true,
      expandable: true,
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
      searchableFields={['reference_id', 'title', 'status', 'action_by_name']}
    />
  );
}
