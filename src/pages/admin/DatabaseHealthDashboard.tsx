import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Database, 
  Shield, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Users,
  Link2Off,
  ShieldCheck,
  ShieldAlert,
  FileWarning,
  Table2,
  Lock,
  Unlock,
  Info
} from 'lucide-react';
import { 
  useDatabaseHealthSummary, 
  useTenantIsolationStatus, 
  useOrphanedRecords,
  useDataIntegrityIssues,
  type HealthSummary,
  type TenantIsolationStatus,
  type OrphanedRecord,
  type DataIntegrityIssue
} from '@/hooks/use-database-health';
import { AdminRoute } from '@/components/AdminRoute';
import { cn } from '@/lib/utils';

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
    healthy: 'secondary',
    warning: 'default',
    critical: 'destructive',
  };
  
  const icons: Record<string, React.ReactNode> = {
    healthy: <CheckCircle2 className="h-3 w-3" />,
    warning: <AlertTriangle className="h-3 w-3" />,
    critical: <XCircle className="h-3 w-3" />,
  };
  
  return (
    <Badge variant={variants[status] || 'outline'} className="capitalize gap-1">
      {icons[status]}
      {status}
    </Badge>
  );
}

// Severity badge component
function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
    critical: 'destructive',
    high: 'destructive',
    medium: 'default',
    warning: 'default',
    low: 'secondary',
    info: 'outline',
  };
  
  return (
    <Badge variant={variants[severity] || 'default'} className="capitalize">
      {severity}
    </Badge>
  );
}

// Stat card component
function StatCard({ 
  title, 
  status, 
  issueCount,
  icon: Icon, 
  description,
  isLoading
}: { 
  title: string; 
  status: 'healthy' | 'warning' | 'critical' | string;
  issueCount: number;
  icon: React.ElementType;
  description?: string;
  isLoading?: boolean;
}) {
  const statusColors = {
    healthy: 'text-green-500 border-green-500/20 bg-green-500/10',
    warning: 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10',
    critical: 'text-destructive border-destructive/20 bg-destructive/10',
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn("border-2", statusColors[status as keyof typeof statusColors] || '')}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-5 w-5", {
          'text-green-500': status === 'healthy',
          'text-yellow-500': status === 'warning',
          'text-destructive': status === 'critical',
        })} />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          {issueCount > 0 && (
            <span className="text-sm text-muted-foreground">
              ({issueCount} issue{issueCount !== 1 ? 's' : ''})
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Health overview component
function HealthOverview({ summaries, isLoading }: { summaries: HealthSummary[] | undefined; isLoading: boolean }) {
  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'tenant_isolation':
        return { 
          title: 'Tenant Isolation', 
          icon: Shield, 
          description: 'Row-level security and data separation between tenants' 
        };
      case 'orphaned_records':
        return { 
          title: 'Orphaned Records', 
          icon: Link2Off, 
          description: 'Records referencing non-existent parent data' 
        };
      case 'data_integrity':
        return { 
          title: 'Data Integrity', 
          icon: Database, 
          description: 'Constraint violations and data quality issues' 
        };
      default:
        return { title: category, icon: Info, description: '' };
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map(i => (
          <StatCard 
            key={i}
            title="" 
            status="healthy" 
            issueCount={0}
            icon={Database}
            isLoading 
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {summaries?.map(summary => {
        const { title, icon, description } = getCategoryInfo(summary.category);
        return (
          <StatCard
            key={summary.category}
            title={title}
            status={summary.status}
            issueCount={Number(summary.issue_count)}
            icon={icon}
            description={description}
          />
        );
      })}
    </div>
  );
}

// Tenant isolation table
function TenantIsolationTable({ data, isLoading }: { data: TenantIsolationStatus[] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const isolatedCount = data?.filter(t => t.is_properly_isolated).length || 0;
  const totalCount = data?.length || 0;
  const percentage = totalCount > 0 ? Math.round((isolatedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-2xl font-bold">{percentage}%</span>
          <span className="text-sm text-muted-foreground ms-2">
            ({isolatedCount} / {totalCount} tables properly isolated)
          </span>
        </div>
        {percentage === 100 ? (
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            All tables secure
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <ShieldAlert className="h-3 w-3" />
            Action required
          </Badge>
        )}
      </div>
      <Progress value={percentage} className="h-2" />
      
      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Table</TableHead>
              <TableHead>Tenant ID</TableHead>
              <TableHead>RLS Enabled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recommendation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.map(table => (
              <TableRow key={table.table_name} className={!table.is_properly_isolated ? 'bg-destructive/5' : ''}>
                <TableCell className="font-mono text-sm">{table.table_name}</TableCell>
                <TableCell>
                  {table.has_tenant_id ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </TableCell>
                <TableCell>
                  {table.has_rls_enabled ? (
                    <Lock className="h-4 w-4 text-green-500" />
                  ) : (
                    <Unlock className="h-4 w-4 text-destructive" />
                  )}
                </TableCell>
                <TableCell>
                  {table.is_properly_isolated ? (
                    <Badge variant="secondary">Isolated</Badge>
                  ) : (
                    <Badge variant="destructive">At Risk</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                  {table.recommendation}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

// Orphaned records table
function OrphanedRecordsTable({ data, isLoading }: { data: OrphanedRecord[] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-semibold">No Orphaned Records</h3>
        <p className="text-muted-foreground">All data references are valid and properly linked.</p>
      </div>
    );
  }

  const totalOrphaned = data.reduce((acc, r) => acc + Number(r.orphaned_count), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="text-lg px-3 py-1">
          {totalOrphaned}
        </Badge>
        <span className="text-muted-foreground">total orphaned records found</span>
      </div>
      
      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Table</TableHead>
              <TableHead>Column</TableHead>
              <TableHead>Count</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Sample IDs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((record, idx) => (
              <TableRow key={`${record.table_name}-${record.column_name}-${idx}`}>
                <TableCell className="font-mono text-sm">{record.table_name}</TableCell>
                <TableCell className="font-mono text-sm">{record.column_name}</TableCell>
                <TableCell className="font-bold">{record.orphaned_count}</TableCell>
                <TableCell>
                  <SeverityBadge severity={record.severity} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                  {record.sample_ids?.join(', ') || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

// Data integrity table
function DataIntegrityTable({ data, isLoading }: { data: DataIntegrityIssue[] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-semibold">No Integrity Issues</h3>
        <p className="text-muted-foreground">All data integrity checks passed successfully.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-4">
        {data.map((issue, idx) => (
          <Card key={`${issue.check_name}-${idx}`} className={cn({
            'border-destructive/50': issue.severity === 'high',
            'border-yellow-500/50': issue.severity === 'warning' || issue.severity === 'medium',
          })}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileWarning className="h-4 w-4" />
                  {issue.check_name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </CardTitle>
                <SeverityBadge severity={issue.severity} />
              </div>
              <CardDescription>{issue.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Table:</span>
                  <span className="ms-2 font-mono text-sm">{issue.table_name}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Count:</span>
                  <span className="ms-2 font-bold">{issue.issue_count}</span>
                </div>
              </div>
              {issue.sample_data && (
                <div className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                  {JSON.stringify(issue.sample_data, null, 2)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

// Main component
function DatabaseHealthDashboardContent() {
  const { t } = useTranslation();
  const { data: summaries, isLoading: summaryLoading, refetch: refetchSummary } = useDatabaseHealthSummary();
  const { data: isolation, isLoading: isolationLoading, refetch: refetchIsolation } = useTenantIsolationStatus();
  const { data: orphaned, isLoading: orphanedLoading, refetch: refetchOrphaned } = useOrphanedRecords();
  const { data: integrity, isLoading: integrityLoading, refetch: refetchIntegrity } = useDataIntegrityIssues();

  const handleRefreshAll = () => {
    refetchSummary();
    refetchIsolation();
    refetchOrphaned();
    refetchIntegrity();
  };

  const overallStatus = summaries?.some(s => s.status === 'critical') 
    ? 'critical' 
    : summaries?.some(s => s.status === 'warning') 
      ? 'warning' 
      : 'healthy';

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-8 w-8" />
            {t('admin.databaseHealth.title', 'Database Health')}
          </h1>
          <p className="text-muted-foreground">
            {t('admin.databaseHealth.description', 'Monitor tenant isolation, data integrity, and orphaned records')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!summaryLoading && (
            <Badge variant={overallStatus === 'healthy' ? 'secondary' : 'destructive'} className="text-base px-4 py-1 gap-2">
              {overallStatus === 'healthy' ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              {overallStatus.toUpperCase()}
            </Badge>
          )}
          <Button onClick={handleRefreshAll} variant="outline" size="sm">
            <RefreshCcw className="h-4 w-4 me-2" />
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      {/* Health Overview Cards */}
      <HealthOverview summaries={summaries} isLoading={summaryLoading} />

      {/* Detailed Tabs */}
      <Tabs defaultValue="isolation" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="isolation" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.databaseHealth.tenantIsolation', 'Tenant Isolation')}</span>
            <span className="sm:hidden">Isolation</span>
          </TabsTrigger>
          <TabsTrigger value="orphaned" className="flex items-center gap-2">
            <Link2Off className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.databaseHealth.orphanedRecords', 'Orphaned Records')}</span>
            <span className="sm:hidden">Orphaned</span>
          </TabsTrigger>
          <TabsTrigger value="integrity" className="flex items-center gap-2">
            <Table2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.databaseHealth.dataIntegrity', 'Data Integrity')}</span>
            <span className="sm:hidden">Integrity</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="isolation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('admin.databaseHealth.tenantIsolationStatus', 'Tenant Isolation Status')}
              </CardTitle>
              <CardDescription>
                {t('admin.databaseHealth.tenantIsolationDesc', 'Row Level Security (RLS) and tenant_id column presence for all tables')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TenantIsolationTable data={isolation} isLoading={isolationLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orphaned">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2Off className="h-5 w-5" />
                {t('admin.databaseHealth.orphanedRecordsTitle', 'Orphaned Records')}
              </CardTitle>
              <CardDescription>
                {t('admin.databaseHealth.orphanedRecordsDesc', 'Records with foreign key references to non-existent parent records')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrphanedRecordsTable data={orphaned} isLoading={orphanedLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="h-5 w-5" />
                {t('admin.databaseHealth.dataIntegrityTitle', 'Data Integrity Issues')}
              </CardTitle>
              <CardDescription>
                {t('admin.databaseHealth.dataIntegrityDesc', 'Constraint violations, missing fields, and data quality issues')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataIntegrityTable data={integrity} isLoading={integrityLoading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DatabaseHealthDashboard() {
  return (
    <AdminRoute>
      <DatabaseHealthDashboardContent />
    </AdminRoute>
  );
}
