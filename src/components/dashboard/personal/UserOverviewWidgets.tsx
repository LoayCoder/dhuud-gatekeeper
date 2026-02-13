import { useNavigate } from 'react-router-dom';
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
    const { tasks } = stats;

    return (
        <UserOverviewSection title="My Tasks">
            <StatCard
                title="Total Active Tasks"
                value={tasks.total}
                icon={CheckSquare}
                onClick={() => navigate('/tasks?status=active')}
            />
            <StatCard
                title="Overdue Tasks"
                value={tasks.overdue}
                icon={AlertTriangle}
                alert={tasks.overdue > 0}
                onClick={() => navigate('/tasks?status=overdue')}
            />
            <StatCard
                title="Due Today"
                value={tasks.dueToday}
                icon={Calendar}
                onClick={() => navigate('/tasks?due=today')}
            />
            <StatCard
                title="Due This Week"
                value={tasks.dueThisWeek}
                icon={Clock}
                onClick={() => navigate('/tasks?due=week')}
            />
        </UserOverviewSection>
    );
}

export function MyIncidentsSection({ stats }: WidgetProps) {
    const navigate = useNavigate();
    const { incidents } = stats;

    return (
        <UserOverviewSection title="My Incidents">
            <StatCard
                title="Assigned Investigations"
                value={incidents.assigned.length}
                icon={FileSearch}
                onClick={() => navigate('/incidents?tab=investigations')}
            />
            <StatCard
                title="Pending Reports"
                value={incidents.pendingReport.length}
                icon={FileText}
                description="Draft or Info Needed"
                onClick={() => navigate('/incidents?status=draft')}
            />
            <StatCard
                title="Awaiting Action"
                value={incidents.awaitingAction.length}
                icon={Activity}
                onClick={() => navigate('/incidents?action=required')}
            />
        </UserOverviewSection>
    );
}

export function MyObservationsSection({ stats }: WidgetProps) {
    const navigate = useNavigate();
    const { observations } = stats;

    return (
        <UserOverviewSection title="My Observations">
            <StatCard
                title="Reported by Me"
                value={observations.assigned.length}
                icon={Eye}
                onClick={() => navigate('/observations?filter=my')}
            />
            <StatCard
                title="Pending Closure"
                value={observations.pendingClosure.length}
                icon={Clock}
                onClick={() => navigate('/observations?status=pending_closure')}
            />
            <StatCard
                title="Recently Closed"
                value={observations.recentlyClosed.length}
                icon={CheckCircle2}
                onClick={() => navigate('/observations?status=closed')}
            />
        </UserOverviewSection>
    );
}

export function MyCorrectiveActionsSection({ stats }: WidgetProps) {
    const navigate = useNavigate();
    const { actions } = stats;

    return (
        <UserOverviewSection title="My Corrective Actions">
            <StatCard
                title="Assigned Actions"
                value={actions.assigned.length}
                icon={ClipboardCheck}
                onClick={() => navigate('/incidents/actions')}
            />
            <StatCard
                title="Overdue Actions"
                value={actions.overdue.length}
                icon={AlertCircle}
                alert={actions.overdue.length > 0}
                onClick={() => navigate('/incidents/actions?status=overdue')}
            />
            <StatCard
                title="Pending Verification"
                value={actions.pendingVerification.length}
                icon={PlayCircle}
                onClick={() => navigate('/incidents/actions?status=pending_verification')}
            />
        </UserOverviewSection>
    );
}

export function MyApprovalsSection({ stats }: WidgetProps) {
    const navigate = useNavigate();
    const { approvals } = stats;

    return (
        <UserOverviewSection title="My Approvals">
            <StatCard
                title="Pending Approvals"
                value={approvals.pending.length}
                icon={Clock}
                alert={approvals.pending.length > 0}
                onClick={() => navigate('/approvals')}
            />
            <StatCard
                title="Recently Approved"
                value={approvals.recentlyApproved.length}
                icon={ThumbsUp}
                onClick={() => navigate('/approvals?status=approved')}
            />
            <StatCard
                title="Recently Rejected"
                value={approvals.recentlyRejected.length}
                icon={ThumbsDown}
                onClick={() => navigate('/approvals?status=rejected')}
            />
        </UserOverviewSection>
    );
}
