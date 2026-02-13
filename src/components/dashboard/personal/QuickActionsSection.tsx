
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
            title: 'Report Incident',
            description: 'Log an HSSE incident',
            icon: AlertTriangle,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            path: '/incidents/report' // Verify route
        },
        {
            title: 'Report Observation',
            description: 'Share an HSSE observation',
            icon: Eye,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            path: '/observations/new' // Verify route
        },
        {
            title: 'My Actions',
            description: 'View assigned tasks',
            icon: ClipboardList,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
            path: '/action-center' // Closest match to "My Actions" list
        },
        {
            title: 'Create Gate Pass',
            description: 'Request material movement',
            icon: Package,
            color: 'text-yellow-500',
            bg: 'bg-yellow-500/10',
            path: '/gate-passes/new'
        }
    ];

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Quick Actions</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {actions.map((action, index) => (
                    <Card
                        key={index}
                        className="group relative overflow-hidden p-4 hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-transparent hover:border-l-primary hover:-translate-y-1"
                        onClick={() => navigate(action.path)}
                    >
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-r ${action.bg.replace('/10', '/20')} to-transparent`} />

                        <div className="relative flex items-center space-x-4">
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
