import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ClipboardCheck, ListChecks, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuickAction {
  icon: React.ReactNode;
  labelKey: string;
  path: string;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
}

export function HomeQuickActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      icon: <AlertTriangle className="h-6 w-6" />,
      labelKey: 'home.reportEvent',
      path: '/incidents/report',
      variant: 'destructive',
    },
    {
      icon: <ClipboardCheck className="h-6 w-6" />,
      labelKey: 'home.startInspection',
      path: '/inspections',
      variant: 'secondary',
    },
    {
      icon: <ListChecks className="h-6 w-6" />,
      labelKey: 'home.myActions',
      path: '/incidents/my-actions',
      variant: 'outline',
    },
    {
      icon: <CheckSquare className="h-6 w-6" />,
      labelKey: 'home.myApprovals',
      path: '/incidents/investigate',
      variant: 'outline',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('home.quickActions')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Button
              key={action.path}
              variant={action.variant}
              className="h-20 flex-col gap-2 text-sm"
              onClick={() => navigate(action.path)}
            >
              {action.icon}
              <span className="text-center leading-tight">{t(action.labelKey)}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
