import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle2, XCircle, AlertCircle, Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { formatPrice } from '@/hooks/use-price-calculator';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface SubscriptionRequest {
  id: string;
  tenant_id: string;
  request_type: string;
  requested_plan_id: string | null;
  requested_user_limit: number;
  requested_modules: string[] | null;
  calculated_total_monthly: number;
  status: string;
  tenant_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  tenant: { name: string } | null;
  requested_plan: { display_name: string } | null;
}

interface SubscriptionRequestsTableProps {
  onReviewRequest: (request: SubscriptionRequest) => void;
  statusFilter?: string;
}

const RTL_LANGUAGES = ['ar', 'ur'];
const PAGE_SIZE = 20;

export function SubscriptionRequestsTable({ onReviewRequest, statusFilter }: SubscriptionRequestsTableProps) {
  const { t, i18n } = useTranslation();
  const isRTL = RTL_LANGUAGES.includes(i18n.language);

  const {
    data: paginatedData,
    isLoading,
    page,
    totalPages,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
  } = usePaginatedQuery<SubscriptionRequest>({
    queryKey: ['admin-subscription-requests', statusFilter],
    queryFn: async ({ from, to }) => {
      let query = supabase
        .from('subscription_requests')
        .select(`
          *,
          tenant:tenants!subscription_requests_tenant_id_fkey(name),
          requested_plan:plans!subscription_requests_requested_plan_id_fkey(display_name)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending' | 'under_review' | 'approved' | 'declined' | 'modified' | 'canceled');
      }

      const { data, count, error } = await query.range(from, to);
      if (error) throw error;
      return { data: data as SubscriptionRequest[], count: count || 0 };
    },
    pageSize: PAGE_SIZE,
  });

  const requests = paginatedData?.data || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'under_review': return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'declined': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'modified': return <FileText className="h-4 w-4 text-purple-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      under_review: 'default',
      approved: 'default',
      declined: 'destructive',
      modified: 'default',
      canceled: 'outline',
    };
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      under_review: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      approved: 'bg-green-500/10 text-green-600 border-green-500/20',
      declined: 'bg-red-500/10 text-red-600 border-red-500/20',
      modified: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    };
    return (
      <Badge className={colors[status] || ''} variant={variants[status] || 'secondary'}>
        {t(`subscription.status.${status}`, status)}
      </Badge>
    );
  };

  const getRequestTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      new: 'bg-green-500/10 text-green-600',
      upgrade: 'bg-blue-500/10 text-blue-600',
      downgrade: 'bg-orange-500/10 text-orange-600',
      modify: 'bg-purple-500/10 text-purple-600',
      cancel: 'bg-red-500/10 text-red-600',
    };
    return (
      <Badge variant="outline" className={colors[type] || ''}>
        {t(`subscription.requestType.${type}`, type)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle>{t('adminSubscription.pendingRequests')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingCount = requests.filter(r => r.status === 'pending' || r.status === 'under_review').length;

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {t('adminSubscription.subscriptionRequests')}
              {pendingCount > 0 && (
                <Badge variant="destructive" className="rounded-full">
                  {pendingCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{t('adminSubscription.requestsDescription')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">{t('adminSubscription.noRequests')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('adminSubscription.tenant')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('adminSubscription.type')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('adminSubscription.requestedPlan')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('adminSubscription.price')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('common.status')}</TableHead>
                <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t('adminSubscription.submitted')}</TableHead>
                <TableHead className={isRTL ? 'text-left' : 'text-right'}>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id} className={request.status === 'pending' ? 'bg-yellow-500/5' : ''}>
                  <TableCell className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                    {request.tenant?.name || '-'}
                  </TableCell>
                  <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                    {getRequestTypeBadge(request.request_type)}
                  </TableCell>
                  <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                    <div>
                      <span>{request.requested_plan?.display_name || '-'}</span>
                      <span className="text-xs text-muted-foreground block">
                        {request.requested_user_limit} {t('subscription.users')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                    <span className="font-medium">
                      {formatPrice(request.calculated_total_monthly)}
                    </span>
                    <span className="text-xs text-muted-foreground">/{t('subscription.month')}</span>
                  </TableCell>
                  <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                      {getStatusIcon(request.status)}
                      {getStatusBadge(request.status)}
                    </div>
                  </TableCell>
                  <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="text-sm">
                      {format(new Date(request.created_at), 'MMM d, yyyy')}
                      <span className="text-xs text-muted-foreground block">
                        {format(new Date(request.created_at), 'HH:mm')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className={isRTL ? 'text-left' : 'text-right'}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onReviewRequest(request)}
                      className={isRTL ? 'flex-row-reverse' : ''}
                    >
                      <Eye className={`h-4 w-4 ${isRTL ? 'ms-1' : 'me-1'}`} />
                      {request.status === 'pending' || request.status === 'under_review' 
                        ? t('adminSubscription.review')
                        : t('adminSubscription.view')
                      }
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {totalCount > 0 && (
          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={PAGE_SIZE}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            isLoading={isLoading}
            onNextPage={goToNextPage}
            onPreviousPage={goToPreviousPage}
            onFirstPage={goToFirstPage}
          />
        )}
      </CardContent>
    </Card>
  );
}
