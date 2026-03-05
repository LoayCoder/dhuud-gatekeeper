import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { EnterprisePage } from '@/components/layout/EnterprisePage';
import { DashboardHeader } from '@/components/dashboard/personal';
import { useUserOverviewStats } from '@/features/users';
import {
  MyTasksSection,
  MyIncidentsSection,
  MyObservationsSection,
  MyCorrectiveActionsSection,
  MyApprovalsSection
} from '@/components/dashboard/personal/UserOverviewWidgets';
import { QuickActionsSection } from '@/components/dashboard/personal/QuickActionsSection';
import { RecognitionSection } from '@/components/dashboard/personal/RecognitionSection';
export default function Dashboard() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useUserOverviewStats();

  if (isLoading || !stats) {
    return (
      <EnterprisePage title="" description="" className="space-y-6">
        <DashboardHeader />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-xl" />)}
        </div>
      </EnterprisePage>
    );
  }

  return (
    <EnterprisePage
      title=""
      description=""
      className="space-y-8 animate-in fade-in relative"
    >
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl opacity-50 mix-blend-multiply dark:mix-blend-screen animate-blob" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl opacity-50 mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000" />
      </div>

      {/* Header with greeting */}
      <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
        <DashboardHeader />
      </div>

      {/* Quick Actions */}
      <QuickActionsSection />

      {/* 1. My Tasks */}
      <MyTasksSection stats={stats} />

      {/* Recognition & Achievements - Moving up as it's engaging */}
      <RecognitionSection />

      {/* 2. My Incidents */}
      <MyIncidentsSection stats={stats} />

      {/* 3. My Corrective Actions */}
      <MyCorrectiveActionsSection stats={stats} />

      {/* 4. My Observations */}
      <MyObservationsSection stats={stats} />

      {/* 5. My Approvals */}
      <MyApprovalsSection stats={stats} />

    </EnterprisePage>
  );
}

