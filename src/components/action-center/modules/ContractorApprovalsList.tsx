import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StatusDot } from '@/components/ui/status-badge';
import { ActionListTable, type ActionListColumn } from '../ActionListTable';
import { usePendingCompanyApprovals } from '@/features/contractors/hooks/use-contractor-companies';

export function ContractorApprovalsList() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: companies, isLoading } = usePendingCompanyApprovals();

  const items = (companies || []).map((c) => ({
    ...c,
    display_name: (i18n.language === 'ar' && c.company_name_ar) ? c.company_name_ar : c.company_name,
  }));

  type RowItem = typeof items[number];

  const columns: ActionListColumn<RowItem>[] = [
    {
      key: 'display_name',
      label: t('actionCenter.columns.companyName', 'Company Name'),
      sortable: true,
      primary: true,
      render: (item) => (
        <div className="flex flex-col gap-0.5">
          <span className="line-clamp-2 font-medium">{item.display_name}</span>
          {item.commercial_registration_number && (
            <span className="font-mono text-[10px] text-muted-foreground">CR: {item.commercial_registration_number}</span>
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
      key: 'city',
      label: t('actionCenter.columns.city', 'City'),
      sortable: true,
      expandable: true,
      render: (item) => <span className="text-xs text-muted-foreground">{item.city || '—'}</span>,
    },
    {
      key: 'approval_requested_at',
      label: t('actionCenter.columns.requestedDate', 'Requested'),
      sortable: true,
      expandable: true,
      render: (item) =>
        item.approval_requested_at
          ? new Date(item.approval_requested_at).toLocaleDateString(
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
      onRowClick={(item) => navigate(`/contractors/companies`)}
      emptyMessage={t('actionCenter.sheet.noContractorApprovals', 'No pending company approvals')}
      searchableFields={['display_name', 'company_name', 'commercial_registration_number', 'city', 'status']}
    />
  );
}
