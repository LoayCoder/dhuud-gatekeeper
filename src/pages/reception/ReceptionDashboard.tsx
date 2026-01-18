/**
 * Reception Dashboard Page
 * Main dashboard for receptionists to manage walk-in visitors,
 * today's expected visitors, and quick check-in/check-out actions.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  UserPlus, 
  Users, 
  Search, 
  CalendarClock, 
  BadgeCheck,
  RefreshCw,
  QrCode
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useVisitors } from '@/hooks/use-visitors';
import { useTodaysVisitors } from '@/hooks/use-visit-requests';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { QuickCheckinCard } from '@/components/reception/QuickCheckinCard';
import { TodayVisitorsWidget } from '@/components/reception/TodayVisitorsWidget';

export default function ReceptionDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch today's expected visitors
  const { data: todayVisitors, isLoading: loadingToday, refetch: refetchToday } = useTodaysVisitors();
  
  // Fetch all visitors for search
  const { data: allVisitors, isLoading: loadingVisitors } = useVisitors({ search: searchQuery });

  const stats = {
    expected: todayVisitors?.filter(v => v.status === 'approved' || v.status === 'pending_security')?.length || 0,
    checkedIn: todayVisitors?.filter(v => v.status === 'checked_in')?.length || 0,
    checkedOut: todayVisitors?.filter(v => v.status === 'checked_out')?.length || 0,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('reception.dashboard', 'Reception Dashboard')}
          </h1>
          <p className="text-muted-foreground">
            {t('reception.dashboardDescription', 'Manage visitor check-ins and registrations')}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchToday()}>
            <RefreshCw className="h-4 w-4 me-2" />
            {t('common.refresh', 'Refresh')}
          </Button>
          <Button onClick={() => navigate('/reception/walk-in')}>
            <UserPlus className="h-4 w-4 me-2" />
            {t('reception.walkInRegistration', 'Walk-In Registration')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('reception.expectedToday', 'Expected Today')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.expected}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('reception.currentlyOnSite', 'Currently On Site')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold text-green-600">{stats.checkedIn}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('reception.checkedOutToday', 'Checked Out Today')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.checkedOut}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t('reception.quickSearch', 'Quick Search')}
          </CardTitle>
          <CardDescription>
            {t('reception.searchDescription', 'Search visitors by name, phone, or national ID')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('reception.searchPlaceholder', 'Enter name, phone, or ID...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10"
              />
            </div>
            <Button variant="outline" onClick={() => navigate('/visitors/list')}>
              {t('reception.viewAll', 'View All Visitors')}
            </Button>
          </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="mt-4 border rounded-lg divide-y">
              {loadingVisitors ? (
                <div className="p-4 space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : allVisitors && allVisitors.length > 0 ? (
                allVisitors.slice(0, 5).map((visitor) => (
                  <QuickCheckinCard key={visitor.id} visitor={visitor} />
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  {t('reception.noVisitorsFound', 'No visitors found matching your search')}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Visitors */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                {t('reception.todaysVisitors', "Today's Visitors")}
              </CardTitle>
              <CardDescription>
                {t('reception.todaysVisitorsDescription', 'Pre-registered visitors expected today')}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/reception/today')}>
              {t('common.viewAll', 'View All')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <TodayVisitorsWidget 
            visitors={todayVisitors || []} 
            isLoading={loadingToday} 
          />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button
          variant="outline"
          className="h-auto py-6 flex flex-col items-center gap-2"
          onClick={() => navigate('/reception/walk-in')}
        >
          <UserPlus className="h-8 w-8 text-primary" />
          <span className="font-medium">{t('reception.registerWalkIn', 'Register Walk-In')}</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-6 flex flex-col items-center gap-2"
          onClick={() => navigate('/visitors/register')}
        >
          <CalendarClock className="h-8 w-8 text-primary" />
          <span className="font-medium">{t('reception.preRegister', 'Pre-Register Visitor')}</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-6 flex flex-col items-center gap-2"
          onClick={() => navigate('/security/gate-dashboard')}
        >
          <QrCode className="h-8 w-8 text-primary" />
          <span className="font-medium">{t('reception.scanQR', 'Scan QR Code')}</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-6 flex flex-col items-center gap-2"
          onClick={() => navigate('/visitors/list')}
        >
          <Users className="h-8 w-8 text-primary" />
          <span className="font-medium">{t('reception.allVisitors', 'All Visitors')}</span>
        </Button>
      </div>
    </div>
  );
}
