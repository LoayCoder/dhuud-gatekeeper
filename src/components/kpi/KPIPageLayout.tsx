import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Target, History, HelpCircle, ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { KPIHelpDrawer } from './KPIHelpDrawer';

interface KPIPageLayoutProps {
  children: ReactNode;
  activeTab?: 'targets' | 'audit';
}

export function KPIPageLayout({ children, activeTab = 'targets' }: KPIPageLayoutProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const isRTL = i18n.dir() === 'rtl';

  const tabs = [
    { id: 'targets', path: '/admin/kpi-targets', icon: Target, label: t('kpiAdmin.targets', 'Targets') },
    { id: 'audit', path: '/admin/kpi-targets/audit', icon: History, label: t('kpiAdmin.auditLog', 'Audit Log') },
  ];

  const currentTab = tabs.find(tab => location.pathname === tab.path)?.id || activeTab;

  return (
    <div className="min-h-screen bg-background">
      {/* Simple accent bar */}
      <div className="h-1 bg-primary/20" />

      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6 sm:px-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent" onClick={() => navigate('/admin')}>
              <Home className="h-4 w-4" />
            </Button>
            <ChevronRight className={cn("h-4 w-4", isRTL && "rotate-180")} />
            <span>{t('admin.settings', 'Settings')}</span>
            <ChevronRight className={cn("h-4 w-4", isRTL && "rotate-180")} />
            <span className="text-foreground font-medium">{t('kpiAdmin.title', 'KPI Targets')}</span>
          </nav>

          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {t('kpiAdmin.title', 'KPI Targets Management')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t('kpiAdmin.description', 'Configure target values and alert thresholds for safety KPIs')}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)}>
              <HelpCircle className="h-4 w-4 me-2" />
              {t('common.help', 'Help')}
            </Button>
          </div>

          {/* Tabs */}
          <div className="mt-6">
            <Tabs value={currentTab} onValueChange={(value) => {
              const tab = tabs.find(t => t.id === value);
              if (tab) navigate(tab.path);
            }}>
              <TabsList className="h-auto p-1 bg-muted/50">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2"
                    >
                      <Icon className="h-4 w-4 me-2" />
                      {tab.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 sm:px-6">
        {children}
      </div>

      <KPIHelpDrawer open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
