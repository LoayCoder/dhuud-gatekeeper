import { KPIPageLayout } from '@/components/kpi/KPIPageLayout';
import { KPIAuditLog } from '@/components/kpi/KPIAuditLog';

export default function KPIAuditLogPage() {
  return (
    <KPIPageLayout activeTab="audit">
      <KPIAuditLog />
    </KPIPageLayout>
  );
}
