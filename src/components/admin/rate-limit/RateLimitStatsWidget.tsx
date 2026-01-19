import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Activity,
  RefreshCw,
  Plus,
  AlertTriangle,
  Ban,
  CheckCircle2,
} from 'lucide-react';
import { useRateLimitStats } from '@/hooks/admin/use-rate-limit-stats';
import { IPBlocklistTable } from './IPBlocklistTable';
import { WhitelistTable } from './WhitelistTable';
import { SuspiciousActivityPanel } from './SuspiciousActivityPanel';
import { BlockIPDialog } from './BlockIPDialog';
import { WhitelistIPDialog } from './WhitelistIPDialog';

interface StatCardProps {
  title: string;
  value: number | undefined;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger' | 'success';
  isLoading?: boolean;
}

function StatCard({ title, value, icon, variant = 'default', isLoading }: StatCardProps) {
  const variantStyles = {
    default: 'bg-card border-border',
    warning: 'bg-warning/10 border-warning/30',
    danger: 'bg-destructive/10 border-destructive/30',
    success: 'bg-green-500/10 border-green-500/30',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    warning: 'text-warning',
    danger: 'text-destructive',
    success: 'text-green-500',
  };

  return (
    <Card className={`${variantStyles[variant]} border`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold">{value?.toLocaleString() ?? 0}</p>
            )}
          </div>
          <div className={iconStyles[variant]}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RateLimitStatsWidget() {
  const { t } = useTranslation();
  const { data: stats, isLoading, refetch, isRefetching } = useRateLimitStats();
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [whitelistDialogOpen, setWhitelistDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              {t('admin.rateLimitStats', 'Rate Limit & IP Blocking')}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 me-1 ${isRefetching ? 'animate-spin' : ''}`} />
              {t('common.refresh', 'Refresh')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWhitelistDialogOpen(true)}
            >
              <CheckCircle2 className="h-4 w-4 me-1" />
              {t('admin.whitelist', 'Whitelist')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBlockDialogOpen(true)}
            >
              <Ban className="h-4 w-4 me-1" />
              {t('admin.blockIP', 'Block IP')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard
            title={t('admin.requests24h', 'Requests (24h)')}
            value={stats?.total_requests_24h}
            icon={<Activity className="h-5 w-5" />}
            isLoading={isLoading}
          />
          <StatCard
            title={t('admin.failed', 'Failed')}
            value={stats?.failed_requests_24h}
            icon={<AlertTriangle className="h-5 w-5" />}
            variant={stats?.failed_requests_24h && stats.failed_requests_24h > 10 ? 'warning' : 'default'}
            isLoading={isLoading}
          />
          <StatCard
            title={t('admin.blocked', 'Blocked')}
            value={stats?.blocked_requests_24h}
            icon={<Ban className="h-5 w-5" />}
            variant={stats?.blocked_requests_24h && stats.blocked_requests_24h > 0 ? 'danger' : 'default'}
            isLoading={isLoading}
          />
          <StatCard
            title={t('admin.tempBlocks', 'Temp Blocks')}
            value={stats?.active_blocks_temporary}
            icon={<ShieldAlert className="h-5 w-5" />}
            variant={stats?.active_blocks_temporary && stats.active_blocks_temporary > 0 ? 'warning' : 'default'}
            isLoading={isLoading}
          />
          <StatCard
            title={t('admin.permBlocks', 'Perm Blocks')}
            value={stats?.active_blocks_permanent}
            icon={<Shield className="h-5 w-5" />}
            variant={stats?.active_blocks_permanent && stats.active_blocks_permanent > 0 ? 'danger' : 'default'}
            isLoading={isLoading}
          />
          <StatCard
            title={t('admin.whitelisted', 'Whitelisted')}
            value={stats?.whitelisted_ips}
            icon={<ShieldCheck className="h-5 w-5" />}
            variant="success"
            isLoading={isLoading}
          />
          <StatCard
            title={t('admin.threats', 'Threats (24h)')}
            value={stats?.threats_detected_24h}
            icon={<AlertTriangle className="h-5 w-5" />}
            variant={stats?.threats_detected_24h && stats.threats_detected_24h > 5 ? 'danger' : 'default'}
            isLoading={isLoading}
          />
        </div>

        {/* Tabs for detailed views */}
        <Tabs defaultValue="blocked" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="blocked" className="flex items-center gap-1">
              <Ban className="h-4 w-4" />
              {t('admin.blockedIPs', 'Blocked IPs')}
              {stats?.active_blocks_temporary || stats?.active_blocks_permanent ? (
                <Badge variant="secondary" className="ms-1">
                  {(stats?.active_blocks_temporary ?? 0) + (stats?.active_blocks_permanent ?? 0)}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="whitelist" className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />
              {t('admin.whitelist', 'Whitelist')}
              {stats?.whitelisted_ips ? (
                <Badge variant="secondary" className="ms-1">
                  {stats.whitelisted_ips}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              {t('admin.suspiciousActivity', 'Activity Log')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="blocked" className="mt-4">
            <IPBlocklistTable />
          </TabsContent>
          
          <TabsContent value="whitelist" className="mt-4">
            <WhitelistTable />
          </TabsContent>
          
          <TabsContent value="activity" className="mt-4">
            <SuspiciousActivityPanel />
          </TabsContent>
        </Tabs>
      </CardContent>

      <BlockIPDialog 
        open={blockDialogOpen} 
        onOpenChange={setBlockDialogOpen} 
      />
      <WhitelistIPDialog 
        open={whitelistDialogOpen} 
        onOpenChange={setWhitelistDialogOpen} 
      />
    </Card>
  );
}
