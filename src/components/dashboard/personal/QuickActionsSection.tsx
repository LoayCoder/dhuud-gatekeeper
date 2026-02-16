
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import {
    AlertTriangle,
    Eye,
    ClipboardList,
    Package
} from 'lucide-react';

export function QuickActionsSection() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const actions = [
        {
            title: t('dashboard.reportIncident', 'Report Incident'),
            description: t('dashboard.reportIncidentDesc', 'Log an HSSE incident'),
            icon: AlertTriangle,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            path: '/incidents/report'
        },
        {
            title: t('dashboard.reportObservation', 'Report Observation'),
            description: t('dashboard.reportObservationDesc', 'Share an HSSE observation'),
            icon: Eye,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            path: '/observations/new'
        },
        {
            title: t('dashboard.myActions', 'My Actions'),
            description: t('dashboard.myActionsDesc', 'View assigned tasks'),
            icon: ClipboardList,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
            path: '/action-center'
        },
        {
            title: t('dashboard.createGatePass', 'Create Gate Pass'),
            description: t('dashboard.createGatePassDesc', 'Request material movement'),
            icon: Package,
            color: 'text-yellow-500',
            bg: 'bg-yellow-500/10',
            path: '/gate-passes/new'
        }
    ];

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">{t('dashboard.quickActions', 'Quick Actions')}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {actions.map((action, index) => (
                    <Card
                        key={index}
                        className="group relative overflow-hidden p-4 hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-transparent hover:border-l-primary hover:-translate-y-1"
                        onClick={() => navigate(action.path)}
                    >
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-r ${action.bg.replace('/10', '/20')} to-transparent`} />

                        <div className="relative flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${action.bg} group-hover:scale-110 transition-transform duration-300`}>
                                <action.icon className={`w-6 h-6 ${action.color}`} />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{action.title}</h3>
                                <p className="text-xs text-muted-foreground">{action.description}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
