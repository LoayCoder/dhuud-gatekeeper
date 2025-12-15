import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Clock, CheckCircle2, AlertTriangle, UserPlus, QrCode, List, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  usePendingSecurityRequests, 
  useTodaysVisitors, 
  useCurrentlyOnSite,
  useApproveVisitRequest,
  useRejectVisitRequest,
} from '@/hooks/use-visit-requests';
import { format } from 'date-fns';
import { VisitApprovalDialog } from '@/components/visitors/VisitApprovalDialog';
import { useState } from 'react';

export default function VisitorDashboard() {
  const { t } = useTranslation();
  const { data: pendingRequests, isLoading: pendingLoading } = usePendingSecurityRequests();
  const { data: todaysVisitors, isLoading: todayLoading } = useTodaysVisitors();
  const { data: onSiteVisitors, isLoading: onSiteLoading } = useCurrentlyOnSite();
  
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  const pendingCount = pendingRequests?.length ?? 0;
  const todayCount = todaysVisitors?.length ?? 0;
  const onSiteCount = onSiteVisitors?.length ?? 0;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending_security: { variant: 'secondary', label: t('visitors.status.pending') },
      approved: { variant: 'default', label: t('visitors.status.approved') },
      rejected: { variant: 'destructive', label: t('visitors.status.rejected') },
      checked_in: { variant: 'default', label: t('visitors.status.checkedIn') },
      checked_out: { variant: 'outline', label: t('visitors.status.checkedOut') },
      expired: { variant: 'destructive', label: t('visitors.status.expired') },
    };
    const config = variants[status] ?? { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('visitors.dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('visitors.dashboard.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/security/gate-dashboard?tab=visitors">
              <QrCode className="me-2 h-4 w-4" />
              {t('security.gateDashboard.title', 'Gate Dashboard')}
            </Link>
          </Button>
          <Button asChild>
            <Link to="/visitors/register">
              <UserPlus className="me-2 h-4 w-4" />
              {t('visitors.register.title')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('visitors.stats.pending')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">{t('visitors.stats.awaitingApproval')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('visitors.stats.todayExpected')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCount}</div>
            <p className="text-xs text-muted-foreground">{t('visitors.stats.scheduledToday')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('visitors.stats.onSite')}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{onSiteCount}</div>
            <p className="text-xs text-muted-foreground">{t('visitors.stats.currentlyOnSite')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('visitors.blacklist.title')}</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link to="/visitors/blacklist">
                {t('visitors.blacklist.manage')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            {t('visitors.tabs.pending')}
            {pendingCount > 0 && <Badge variant="secondary">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="today" className="gap-2">
            <Users className="h-4 w-4" />
            {t('visitors.tabs.today')}
          </TabsTrigger>
          <TabsTrigger value="onsite" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {t('visitors.tabs.onSite')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>{t('visitors.pending.title')}</CardTitle>
              <CardDescription>{t('visitors.pending.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
              ) : pendingRequests?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>{t('visitors.pending.noRequests')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests?.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{request.visitor?.full_name}</span>
                          {getStatusBadge(request.status ?? 'pending_security')}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          <span>{request.visitor?.company_name}</span>
                          {request.site && <span> • {request.site.name}</span>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(request.valid_from), 'PPp')} - {format(new Date(request.valid_until), 'PPp')}
                        </div>
                      </div>
                      <Button size="sm" onClick={() => setSelectedRequest(request.id)}>
                        {t('visitors.actions.review')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="today">
          <Card>
            <CardHeader>
              <CardTitle>{t('visitors.today.title')}</CardTitle>
              <CardDescription>{t('visitors.today.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {todayLoading ? (
                <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
              ) : todaysVisitors?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>{t('visitors.today.noVisitors')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todaysVisitors?.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{request.visitor?.full_name}</span>
                          {getStatusBadge(request.status ?? 'pending_security')}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {request.site?.name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="onsite">
          <Card>
            <CardHeader>
              <CardTitle>{t('visitors.onSite.title')}</CardTitle>
              <CardDescription>{t('visitors.onSite.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {onSiteLoading ? (
                <div className="animate-pulse text-muted-foreground">{t('common.loading')}</div>
              ) : onSiteVisitors?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>{t('visitors.onSite.noVisitors')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {onSiteVisitors?.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{request.visitor?.full_name}</span>
                          {getStatusBadge(request.status ?? 'checked_in')}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {request.site?.name}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/security/gate-dashboard?tab=visitors`}>
                          {t('visitors.actions.checkOut')}
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Links */}
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link to="/visitors/list">
            <List className="me-2 h-4 w-4" />
            {t('visitors.list.title')}
          </Link>
        </Button>
      </div>

      {/* Approval Dialog */}
      <VisitApprovalDialog
        requestId={selectedRequest}
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
      />
    </div>
  );
}
