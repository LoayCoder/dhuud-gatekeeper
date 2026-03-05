import { useTranslation } from 'react-i18next';
import { Users, UserCheck, UserX, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface UserStatsCardsProps {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pendingInvitations?: number;
  isLoading?: boolean;
}

export function UserStatsCards({ 
  totalUsers, 
  activeUsers, 
  inactiveUsers, 
  pendingInvitations = 0,
  isLoading 
}: UserStatsCardsProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const stats = [
    {
      label: t('userManagement.totalUsers', 'Total Users'),
      value: totalUsers,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: t('userManagement.activeUsers', 'Active'),
      value: activeUsers,
      icon: UserCheck,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: t('userManagement.inactiveUsers', 'Inactive'),
      value: inactiveUsers,
      icon: UserX,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
    {
      label: t('userManagement.pendingInvitations', 'Pending'),
      value: pendingInvitations,
      icon: Mail,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" dir={direction}>
      {stats.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-lg", stat.bgColor)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground truncate">
                  {stat.label}
                </p>
                <p className={cn("text-2xl font-bold tracking-tight", isLoading && "animate-pulse")}>
                  {isLoading ? '—' : stat.value.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
