import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StatusDot } from '@/components/ui/status-badge';
import { User } from 'lucide-react';
import { ActionListTable, type ActionListColumn } from '../ActionListTable';
import { usePendingGatePassApprovals } from '@/features/contractors/hooks/use-material-gate-passes';

export function GatePassApprovalsList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: approvals, isLoading } = usePendingGatePassApprovals();

  const items = (approvals || []).map((a) => ({
    ...a,
    company_name: a.company?.company_name || a.project?.company?.company_name || '—',
  }));

  type RowItem = typeof items[number];

  const columns: ActionListColumn<RowItem>[] = [
    {
      key: 'material_description',
      label: t('actionCenter.columns.description', 'Description'),
      sortable: true,
      primary: true,
      render: (item) => (
        <div className="flex flex-col gap-0.5">
          <span className="line-clamp-2 font-medium">{item.material_description}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{item.reference_number}</span>
        </div>
      ),
    },
    {
      key: 'pass_type',
      label: t('actionCenter.columns.type', 'Type'),
      sortable: true,
      render: (item) => (
        <span className="text-xs capitalize">{item.pass_type?.replace(/_/g, ' ') || '—'}</span>
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
      key: 'company_name',
      label: t('actionCenter.columns.company', 'Company'),
      sortable: true,
      expandable: true,
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[120px]">{item.company_name}</span>
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
      items={items as unknown as RowItem[]}
      columns={columns}
      isLoading={isLoading}
      onRowClick={(item) => navigate(`/dept-gate-passes/approvals`)}
      emptyMessage={t('actionCenter.sheet.noGatePassApprovals', 'No pending gate pass approvals')}
      searchableFields={['reference_number', 'material_description', 'pass_type', 'company_name', 'status']}
    />
  );
}
