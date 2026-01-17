/**
 * Today's Visitors Page
 * Full list of all visitors expected or arrived today with check-in/out management.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTodayVisitors, useCheckInVisitor, useCheckOutVisitor } from '@/hooks/use-visit-requests';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

type VisitorStatus = 'all' | 'expected' | 'checked-in' | 'checked-out';

export default function TodayVisitors() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VisitorStatus>('all');

  const { data: visitors, isLoading, refetch } = useTodayVisitors();
  const checkIn = useCheckInVisitor();
  const checkOut = useCheckOutVisitor();

  // Filter visitors based on search and status
  const filteredVisitors = visitors?.filter(visitor => {
    // Search filter
    const matchesSearch = !searchQuery || 
      visitor.visitor?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.visitor?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      visitor.host_name?.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    let matchesStatus = true;
    if (statusFilter === 'expected') {
      matchesStatus = !visitor.checked_in_at;
    } else if (statusFilter === 'checked-in') {
      matchesStatus = !!visitor.checked_in_at && !visitor.checked_out_at;
    } else if (statusFilter === 'checked-out') {
      matchesStatus = !!visitor.checked_out_at;
    }

    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (visitor: any) => {
    if (visitor.checked_out_at) {
      return <Badge variant="secondary">{t('reception.checkedOut', 'Checked Out')}</Badge>;
    }
    if (visitor.checked_in_at) {
      return <Badge className="bg-green-500">{t('reception.onSite', 'On Site')}</Badge>;
    }
    return <Badge variant="outline">{t('reception.expected', 'Expected')}</Badge>;
  };

  const handleCheckIn = async (visitRequestId: string) => {
    await checkIn.mutateAsync(visitRequestId);
  };

  const handleCheckOut = async (visitRequestId: string) => {
    await checkOut.mutateAsync(visitRequestId);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/reception')}>
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {t('reception.todaysVisitors', "Today's Visitors")}
          </h1>
          <p className="text-muted-foreground">
            {t('reception.todaysVisitorsFullDescription', 'Manage all visitors expected or arrived today')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 me-2" />
          {t('common.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('reception.searchVisitors', 'Search by name, company, or host...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as VisitorStatus)}>
              <TabsList>
                <TabsTrigger value="all">{t('common.all', 'All')}</TabsTrigger>
                <TabsTrigger value="expected">{t('reception.expected', 'Expected')}</TabsTrigger>
                <TabsTrigger value="checked-in">{t('reception.onSite', 'On Site')}</TabsTrigger>
                <TabsTrigger value="checked-out">{t('reception.checkedOut', 'Checked Out')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Visitors Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredVisitors.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('reception.noVisitorsToday', 'No visitors scheduled for today')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name', 'Name')}</TableHead>
                  <TableHead>{t('common.company', 'Company')}</TableHead>
                  <TableHead>{t('visitors.host', 'Host')}</TableHead>
                  <TableHead>{t('visitors.scheduledTime', 'Scheduled')}</TableHead>
                  <TableHead>{t('common.status', 'Status')}</TableHead>
                  <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisitors.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="font-medium">
                      {visit.visitor?.full_name || visit.visitor_name || '-'}
                    </TableCell>
                    <TableCell>
                      {visit.visitor?.company_name || '-'}
                    </TableCell>
                    <TableCell>
                      {visit.host_name || '-'}
                    </TableCell>
                    <TableCell>
                      {visit.scheduled_date ? format(new Date(visit.scheduled_date), 'HH:mm') : '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(visit)}
                    </TableCell>
                    <TableCell className="text-end">
                      {!visit.checked_in_at ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleCheckIn(visit.id)}
                          disabled={checkIn.isPending}
                        >
                          {t('reception.checkIn', 'Check In')}
                        </Button>
                      ) : !visit.checked_out_at ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCheckOut(visit.id)}
                          disabled={checkOut.isPending}
                        >
                          {t('reception.checkOut', 'Check Out')}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {visit.checked_out_at && format(new Date(visit.checked_out_at), 'HH:mm')}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
