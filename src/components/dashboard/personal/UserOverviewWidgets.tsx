import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    CheckSquare, AlertTriangle, Calendar, Clock,
    FileSearch, FileText, Activity,
    Eye, CheckCircle2, XCircle,
    ClipboardCheck, PlayCircle, AlertCircle,
    ThumbsUp, ThumbsDown
} from 'lucide-react';
import { UserOverviewSection } from './UserOverviewSection';
import { StatCard } from './StatCard';
import { UserOverviewStats } from '@/hooks/use-user-overview-stats';

interface WidgetProps {
    stats: UserOverviewStats;
}

export function MyTasksSection({ stats }: WidgetProps) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { tasks } = stats;

    return (
        <UserOverviewSection title={t('dashboard.myTasks', 'My Tasks')}>
            <StatCard
                title={t('dashboard.totalActiveTasks', 'Total Active Tasks')}
                value={tasks.total}
                icon={CheckSquare}
                onClick={() => navigate('/tasks?status=active')}
            />
            <StatCard
                title={t('dashboard.overdueTasks', 'Overdue Tasks')}
                value={tasks.overdue}
                icon={AlertTriangle}
                alert={tasks.overdue > 0}
                onClick={() => navigate('/tasks?status=overdue')}
            />
            <StatCard
                title={t('dashboard.dueToday', 'Due Today')}
                value={tasks.dueToday}
                icon={Calendar}
                onClick={() => navigate('/tasks?due=today')}
            />
            <StatCard
                title={t('dashboard.dueThisWeek', 'Due This Week')}
                value={tasks.dueThisWeek}
                icon={Clock}
                onClick={() => navigate('/tasks?due=week')}
            />
        </UserOverviewSection>
    );
}

export function MyIncidentsSection({ stats }: WidgetProps) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { incidents } = stats;

    return (
        <UserOverviewSection title={t('dashboard.myIncidents', 'My Incidents')}>
            <StatCard
                title={t('dashboard.assignedInvestigations', 'Assigned Investigations')}
                value={incidents.assigned.length}
                icon={FileSearch}
                onClick={() => navigate('/incidents?tab=investigations')}
            />
            <StatCard
                title={t('dashboard.pendingReports', 'Pending Reports')}
                value={incidents.pendingReport.length}
                icon={FileText}
                description={t('dashboard.draftOrInfoNeeded', 'Draft or Info Needed')}
                onClick={() => navigate('/incidents?status=draft')}
            />
            <StatCard
                title={t('dashboard.awaitingAction', 'Awaiting Action')}
                value={incidents.awaitingAction.length}
                icon={Activity}
                onClick={() => navigate('/incidents?action=required')}
            />
        </UserOverviewSection>
    );
}

export function MyObservationsSection({ stats }: WidgetProps) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { observations } = stats;

    return (
        <UserOverviewSection title={t('dashboard.myObservations', 'My Observations')}>
            <StatCard
                title={t('dashboard.reportedByMe', 'Reported by Me')}
                value={observations.assigned.length}
                icon={Eye}
                onClick={() => navigate('/observations?filter=my')}
            />
            <StatCard
                title={t('dashboard.pendingClosure', 'Pending Closure')}
                value={observations.pendingClosure.length}
                icon={Clock}
                onClick={() => navigate('/observations?status=pending_closure')}
            />
            <StatCard
                title={t('dashboard.recentlyClosed', 'Recently Closed')}
                value={observations.recentlyClosed.length}
                icon={CheckCircle2}
                onClick={() => navigate('/observations?status=closed')}
            />
        </UserOverviewSection>
    );
}

export function MyCorrectiveActionsSection({ stats }: WidgetProps) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { actions } = stats;

    return (
        <UserOverviewSection title={t('dashboard.myCorrectiveActions', 'My Corrective Actions')}>
            <StatCard
                title={t('dashboard.assignedActions', 'Assigned Actions')}
                value={actions.assigned.length}
                icon={ClipboardCheck}
                onClick={() => navigate('/incidents/actions')}
            />
            <StatCard
                title={t('dashboard.overdueActions', 'Overdue Actions')}
                value={actions.overdue.length}
                icon={AlertCircle}
                alert={actions.overdue.length > 0}
                onClick={() => navigate('/incidents/actions?status=overdue')}
            />
            <StatCard
                title={t('dashboard.pendingVerification', 'Pending Verification')}
                value={actions.pendingVerification.length}
                icon={PlayCircle}
                onClick={() => navigate('/incidents/actions?status=pending_verification')}
            />
        </UserOverviewSection>
    );
}

export function MyApprovalsSection({ stats }: WidgetProps) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { approvals } = stats;

    return (
        <UserOverviewSection title={t('dashboard.myApprovals', 'My Approvals')}>
            <StatCard
                title={t('dashboard.pendingApprovals', 'Pending Approvals')}
                value={approvals.pending.length}
                icon={Clock}
                alert={approvals.pending.length > 0}
                onClick={() => navigate('/approvals')}
            />
            <StatCard
                title={t('dashboard.recentlyApproved', 'Recently Approved')}
                value={approvals.recentlyApproved.length}
                icon={ThumbsUp}
                onClick={() => navigate('/approvals?status=approved')}
            />
            <StatCard
                title={t('dashboard.recentlyRejected', 'Recently Rejected')}
                value={approvals.recentlyRejected.length}
                icon={ThumbsDown}
                onClick={() => navigate('/approvals?status=rejected')}
            />
        </UserOverviewSection>
    );
}
