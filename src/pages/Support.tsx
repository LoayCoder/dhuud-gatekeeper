import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RTLWrapper } from '@/components';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { toast } from 'sonner';
import { Plus, MessageSquare, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { TicketDetail } from '@/components/support/TicketDetail';
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { createSupportTicket } from '@/features/support/services/supportService';
import { supportTicketSchema, type SupportTicketFormValues } from './SupportSchema';

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
}

const statusIcons: Record<TicketStatus, React.ReactNode> = {
  open: <AlertCircle className="h-4 w-4" />,
  in_progress: <Clock className="h-4 w-4" />,
  waiting_customer: <MessageSquare className="h-4 w-4" />,
  resolved: <CheckCircle className="h-4 w-4" />,
  closed: <CheckCircle className="h-4 w-4" />,
};

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

const PAGE_SIZE = 20;

const defaultValues: SupportTicketFormValues = {
  subject: '', description: '', category: 'general', priority: 'medium',
};

export default function Support() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const form = useForm<SupportTicketFormValues>({
    resolver: zodResolver(supportTicketSchema),
    defaultValues,
  });

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
  } = usePaginatedQuery<Ticket>({
    queryKey: ['support-tickets'],
    queryFn: async ({ from, to }) => {
      const { data, count, error } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, subject, description, status, priority, category, created_at, updated_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { data: data as Ticket[], count: count || 0 };
    },
    pageSize: PAGE_SIZE,
  });

  const tickets = paginatedData?.data || [];

  const createMutation = useMutation({
    mutationFn: async (values: SupportTicketFormValues) => {
      return createSupportTicket({
        subject: values.subject,
        description: values.description,
        category: values.category,
        priority: values.priority,
        tenant_id: profile?.tenant_id,
        created_by: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      setIsCreateOpen(false);
      form.reset(defaultValues);
      toast.success(t('support.ticketCreated'));
    },
    onError: (error) => {
      console.error('Error creating ticket:', error);
      toast.error(t('support.createError'));
    },
  });

  const onSubmit = (values: SupportTicketFormValues) => {
    createMutation.mutate(values);
  };

  if (selectedTicket) {
    return (
      <TicketDetail
        ticket={selectedTicket}
        onBack={() => setSelectedTicket(null)}
      />
    );
  }

  return (
    <RTLWrapper>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('support.title')}</h1>
            <p className="text-muted-foreground">{t('support.description')}</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t('support.newTicket')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>{t('support.createTicket')}</DialogTitle>
                <DialogDescription>{t('support.createDescription')}</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                  <FormField control={form.control} name="subject" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('support.subject')}</FormLabel>
                      <FormControl><Input {...field} placeholder={t('support.subjectPlaceholder')} /></FormControl>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('support.category')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="general">{t('support.categories.general')}</SelectItem>
                            <SelectItem value="technical">{t('support.categories.technical')}</SelectItem>
                            <SelectItem value="billing">{t('support.categories.billing')}</SelectItem>
                            <SelectItem value="feature_request">{t('support.categories.featureRequest')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="priority" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('support.priority')}</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="low">{t('support.priorities.low')}</SelectItem>
                            <SelectItem value="medium">{t('support.priorities.medium')}</SelectItem>
                            <SelectItem value="high">{t('support.priorities.high')}</SelectItem>
                            <SelectItem value="urgent">{t('support.priorities.urgent')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('support.description')}</FormLabel>
                      <FormControl><Textarea {...field} placeholder={t('support.descriptionPlaceholder')} rows={5} /></FormControl>
                    </FormItem>
                  )} />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                      {t('support.submit')}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('support.yourTickets')}</CardTitle>
            <CardDescription>{t('support.ticketsDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('support.noTickets')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${statusColors[ticket.status]}`}>
                        {statusIcons[ticket.status]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">#{ticket.ticket_number}</span>
                          <h4 className="font-medium">{ticket.subject}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(ticket.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={priorityColors[ticket.priority]}>
                        {t(`support.priorities.${ticket.priority}`)}
                      </Badge>
                      <Badge variant="outline" className={statusColors[ticket.status]}>
                        {t(`support.statuses.${ticket.status}`)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
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
                className="border-t-0 mt-4"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </RTLWrapper>
  );
}
