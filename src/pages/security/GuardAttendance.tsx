import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  Clock,
  UserCheck,
  UserX,
  Timer,
  TrendingUp,
  RefreshCw,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useGuardAttendance,
  useAttendanceStats,
  useApproveAttendance,
  GuardAttendanceLog,
} from '@/hooks/use-guard-attendance';
import { GuardCheckInWidget } from '@/components/security/GuardCheckInWidget';

export default function GuardAttendance() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'all' | 'checked_in' | 'pending' | 'issues'>('all');
  const [dateFilter, setDateFilter] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: attendance, isLoading, refetch } = useGuardAttendance({
    date: dateFilter,
    status: statusFilter || undefined,
  });

  const { data: stats, isLoading: statsLoading } = useAttendanceStats();
  const approveMutation = useApproveAttendance();

  const filteredAttendance = attendance?.filter((record) => {
    if (activeTab === 'checked_in') return record.status === 'checked_in';
    if (activeTab === 'pending') return record.status === 'checked_out' && !record.approved_at;
    if (activeTab === 'issues') return record.late_minutes > 0 || record.early_departure_minutes > 0 || !record.gps_validated;
    return true;
  });

  const getStatusBadge = (record: GuardAttendanceLog) => {
    switch (record.status) {
      case 'checked_in':
        return <Badge variant="default" className="bg-success text-success-foreground">{t('security.checkedIn', 'Checked In')}</Badge>;
      case 'checked_out':
        return <Badge variant="secondary">{t('security.checkedOut', 'Checked Out')}</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-success text-success">{t('common.approved', 'Approved')}</Badge>;
      case 'rejected':
        return <Badge variant="destructive">{t('common.rejected', 'Rejected')}</Badge>;
      case 'no_show':
        return <Badge variant="destructive">{t('security.noShow', 'No Show')}</Badge>;
      default:
        return <Badge variant="outline">{record.status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            {t('security.guardAttendance', 'Guard Attendance')}
          </h1>
          <p className="text-muted-foreground">
            {t('security.guardAttendanceDesc', 'Track guard check-ins, check-outs, and attendance metrics')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 me-2" />
            {t('common.refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      {/* Check-in Widget for Guards */}
      <GuardCheckInWidget />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.totalRecords', 'Total Records')}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalRecords ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {t('security.last7Days', 'Last 7 days')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={cn(stats?.checkedIn ? 'border-success bg-success/5' : '')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.currentlyOnDuty', 'Currently On Duty')}
            </CardTitle>
            <UserCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-success">{stats?.checkedIn ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {t('security.activeGuards', 'Active guards')}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={cn((stats?.lateArrivals ?? 0) > 0 && 'border-warning bg-warning/5')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.lateArrivals', 'Late Arrivals')}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-warning">{stats?.lateArrivals ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {t('security.avgLate', 'Avg {{minutes}} min late', { minutes: Math.round(stats?.avgLateMinutes ?? 0) })}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.totalHoursWorked', 'Hours Worked')}
            </CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{Math.round(stats?.totalHoursWorked ?? 0)}h</div>
                <p className="text-xs text-muted-foreground">
                  {t('security.overtime', '{{minutes}} min overtime', { minutes: stats?.totalOvertimeMinutes ?? 0 })}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('security.gpsValidation', 'GPS Validation')}
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{Math.round(stats?.gpsValidatedRate ?? 0)}%</div>
                <p className="text-xs text-muted-foreground">
                  {t('security.locationVerified', 'Location verified')}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t('security.attendanceRecords', 'Attendance Records')}</CardTitle>
              <CardDescription>
                {t('security.attendanceRecordsDesc', 'View and manage guard attendance logs')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-auto"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t('common.allStatus', 'All Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('common.all', 'All')}</SelectItem>
                  <SelectItem value="checked_in">{t('security.checkedIn', 'Checked In')}</SelectItem>
                  <SelectItem value="checked_out">{t('security.checkedOut', 'Checked Out')}</SelectItem>
                  <SelectItem value="approved">{t('common.approved', 'Approved')}</SelectItem>
                  <SelectItem value="rejected">{t('common.rejected', 'Rejected')}</SelectItem>
                  <SelectItem value="no_show">{t('security.noShow', 'No Show')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                {t('common.all', 'All')}
                <Badge variant="secondary" className="ms-2">{attendance?.length ?? 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="checked_in">
                {t('security.onDuty', 'On Duty')}
                <Badge variant="default" className="ms-2 bg-success">
                  {attendance?.filter((r) => r.status === 'checked_in').length ?? 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pending">
                {t('security.pendingApproval', 'Pending')}
              </TabsTrigger>
              <TabsTrigger value="issues">
                {t('security.issues', 'Issues')}
              </TabsTrigger>
            </TabsList>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.guard', 'Guard')}</TableHead>
                    <TableHead>{t('security.zone', 'Zone')}</TableHead>
                    <TableHead>{t('security.checkIn', 'Check In')}</TableHead>
                    <TableHead>{t('security.checkOut', 'Check Out')}</TableHead>
                    <TableHead>{t('security.hoursWorked', 'Hours')}</TableHead>
                    <TableHead>{t('common.status', 'Status')}</TableHead>
                    <TableHead>{t('security.gps', 'GPS')}</TableHead>
                    <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={8}>
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredAttendance?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {t('common.noRecordsFound', 'No records found')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAttendance?.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={record.guard?.avatar_url ?? undefined} />
                              <AvatarFallback>
                                {record.guard?.full_name?.charAt(0) ?? 'G'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{record.guard?.full_name ?? 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {record.zone?.zone_name ?? '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {record.check_in_at ? (
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {format(new Date(record.check_in_at), 'HH:mm')}
                              </div>
                              {record.late_minutes > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {record.late_minutes}m late
                                </Badge>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {record.check_out_at ? (
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {format(new Date(record.check_out_at), 'HH:mm')}
                              </div>
                              {record.overtime_minutes > 0 && (
                                <Badge variant="outline" className="text-xs border-success text-success">
                                  +{record.overtime_minutes}m
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline">{t('security.onDuty', 'On Duty')}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.total_hours_worked !== null ? (
                            <span className="font-medium">{record.total_hours_worked.toFixed(1)}h</span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(record)}</TableCell>
                        <TableCell>
                          {record.gps_validated ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="text-end">
                          {record.status === 'checked_out' && !record.approved_at && (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => approveMutation.mutate({ attendanceId: record.id, approved: true })}
                                disabled={approveMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 text-success" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => approveMutation.mutate({ attendanceId: record.id, approved: false, reason: 'Rejected by admin' })}
                                disabled={approveMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
