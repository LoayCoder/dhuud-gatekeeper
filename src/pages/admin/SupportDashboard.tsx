import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RTLWrapper } from '@/components/RTLWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Search, Loader2, MessageSquare, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { AdminTicketDetail } from '@/components/support/AdminTicketDetail';

type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketCategory = 'billing' | 'technical' | 'feature_request' | 'general';

interface Ticket {
  id: string;
  ticket_number: number;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  created_by: string;
  assigned_to: string | null;
  tenants?: { name: string };
}

const statusColors: Record<TicketStatus, string> = {
  open: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  in_progress: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  waiting_customer: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
  closed: 'bg-muted text-muted-foreground border-muted',
};

const priorityColors: Record<TicketPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-500/10 text-blue-500',
  high: 'bg-orange-500/10 text-orange-500',
  urgent: 'bg-destructive/10 text-destructive',
};

const RTL_LANGUAGES = ['ar', 'ur'];

export default function SupportDashboard() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isRTL = RTL_LANGUAGES.includes(i18n.language);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          tenants (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Ticket[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: TicketStatus }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'resolved') updates.resolved_at = new Date().toISOString();
      if (status === 'closed') updates.closed_at = new Date().toISOString();

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      toast.success(t('support.statusUpdated'));
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast.error(t('support.updateError'));
    },
  });

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
      ticket.ticket_number.toString().includes(search) ||
      ticket.tenants?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Stats
  const stats = {
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    urgent: tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed' && t.status !== 'resolved').length,
    total: tickets.length,
  };

  if (selectedTicket) {
    return (
      <AdminTicketDetail 
        ticket={selectedTicket} 
        onBack={() => {
          setSelectedTicket(null);
          queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
        }}
      />
    );
  }

  return (
    <RTLWrapper>
      <div className="space-y-6">
        <div className={isRTL ? 'text-end' : ''}>
          <h1 className="text-3xl font-bold tracking-tight">{t('adminSupport.title')}</h1>
          <p className="text-muted-foreground">{t('adminSupport.description')}</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('adminSupport.openTickets')}</CardDescription>
              <CardTitle className="text-2xl">{stats.open}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('adminSupport.inProgress')}</CardDescription>
              <CardTitle className="text-2xl">{stats.inProgress}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('adminSupport.urgentTickets')}</CardDescription>
              <CardTitle className="text-2xl text-destructive">{stats.urgent}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('adminSupport.totalTickets')}</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>{t('adminSupport.allTickets')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('adminSupport.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 me-2" />
                  <SelectValue placeholder={t('adminSupport.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('adminSupport.allStatuses')}</SelectItem>
                  <SelectItem value="open">{t('support.statuses.open')}</SelectItem>
                  <SelectItem value="in_progress">{t('support.statuses.in_progress')}</SelectItem>
                  <SelectItem value="waiting_customer">{t('support.statuses.waiting_customer')}</SelectItem>
                  <SelectItem value="resolved">{t('support.statuses.resolved')}</SelectItem>
                  <SelectItem value="closed">{t('support.statuses.closed')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t('adminSupport.priority')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('adminSupport.allPriorities')}</SelectItem>
                  <SelectItem value="low">{t('support.priorities.low')}</SelectItem>
                  <SelectItem value="medium">{t('support.priorities.medium')}</SelectItem>
                  <SelectItem value="high">{t('support.priorities.high')}</SelectItem>
                  <SelectItem value="urgent">{t('support.priorities.urgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('adminSupport.noTickets')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{t('adminSupport.subject')}</TableHead>
                    <TableHead>{t('adminSupport.tenant')}</TableHead>
                    <TableHead>{t('adminSupport.priority')}</TableHead>
                    <TableHead>{t('adminSupport.status')}</TableHead>
                    <TableHead>{t('adminSupport.created')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow 
                      key={ticket.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {ticket.subject}
                      </TableCell>
                      <TableCell>{ticket.tenants?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priorityColors[ticket.priority]}>
                          {t(`support.priorities.${ticket.priority}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[ticket.status]}>
                          {t(`support.statuses.${ticket.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(ticket.created_at), 'PP')}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={ticket.status}
                          onValueChange={(status) => {
                            updateStatusMutation.mutate({ 
                              ticketId: ticket.id, 
                              status: status as TicketStatus 
                            });
                          }}
                        >
                          <SelectTrigger 
                            className="w-[140px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">{t('support.statuses.open')}</SelectItem>
                            <SelectItem value="in_progress">{t('support.statuses.in_progress')}</SelectItem>
                            <SelectItem value="waiting_customer">{t('support.statuses.waiting_customer')}</SelectItem>
                            <SelectItem value="resolved">{t('support.statuses.resolved')}</SelectItem>
                            <SelectItem value="closed">{t('support.statuses.closed')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </RTLWrapper>
  );
}
