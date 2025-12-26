import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Settings, BarChart3, FileSearch, HelpCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { SLAHelpDrawer } from './SLAHelpDrawer';
import { useState } from 'react';

interface SLAPageLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  icon?: ReactNode;
}

const tabs = [
  { id: 'dashboard', path: '/admin/sla-dashboard', icon: Activity, labelKey: 'sla.dashboard' },
  { id: 'settings', path: '/admin/action-sla', icon: Settings, labelKey: 'navigation.actionSLASettings' },
  { id: 'analytics', path: '/admin/sla-analytics', icon: BarChart3, labelKey: 'sla.analytics' },
  { id: 'investigation', path: '/admin/investigation-sla', icon: FileSearch, labelKey: 'sla.investigationSLA' },
];

export function SLAPageLayout({ children, title, description, icon }: SLAPageLayoutProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);

  const currentTab = tabs.find(tab => location.pathname === tab.path)?.id || 'dashboard';

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      {/* Gradient accent bar */}
      <div className="h-1 bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-600" />
      
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-primary/10 border-b">
        <div className="container py-6 sm:py-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <span>{t('navigation.admin', 'Admin')}</span>
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            <span>{t('sla.management', 'SLA Management')}</span>
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            <span className="text-foreground font-medium">{title}</span>
          </div>

          {/* Title and Help */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              {icon && (
                <div className="p-3 rounded-xl bg-primary/10 text-primary hidden sm:flex">
                  {icon}
                </div>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
                  <span className="sm:hidden">{icon}</span>
                  {title}
                </h1>
                <p className="text-muted-foreground mt-1 max-w-2xl">
                  {description}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setHelpOpen(true)}
              className="gap-2 shrink-0"
            >
              <HelpCircle className="h-4 w-4" />
              {t('common.help', 'Help')}
            </Button>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 -mb-[1px]">
            <Tabs value={currentTab} className="w-full">
              <TabsList className="h-auto p-1 bg-muted/50 rounded-lg inline-flex flex-wrap gap-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      onClick={() => navigate(tab.path)}
                      className={cn(
                        "gap-2 px-4 py-2.5 text-sm font-medium transition-all",
                        "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                        "data-[state=active]:text-primary"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{t(tab.labelKey, tab.id)}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-6">
        {children}
      </div>

      {/* Help Drawer */}
      <SLAHelpDrawer open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}
