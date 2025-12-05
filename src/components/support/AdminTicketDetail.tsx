import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RTLWrapper } from '@/components/RTLWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Send, Loader2, User, Building2, Clock, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { AgentAssignmentSelect } from '@/components/support/AgentAssignmentSelect';
import { SLAIndicator } from '@/components/support/SLAIndicator';

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
  first_response_at: string | null;
  sla_first_response_due: string | null;
  sla_resolution_due: string | null;
  sla_first_response_breached: boolean;
  sla_resolution_breached: boolean;
  escalation_level: number;
  tenants?: { name: string };
}

interface Message {
  id: string;
  message: string;
  sender_id: string;
  is_internal: boolean;
  created_at: string;
}

interface AdminTicketDetailProps {
  ticket: Ticket;
  onBack: () => void;
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

export function AdminTicketDetail({ ticket, onBack }: AdminTicketDetailProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [localTicket, setLocalTicket] = useState(ticket);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['admin-ticket-messages', ticket.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('id, message, sender_id, is_internal, created_at')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
  });

  // Fetch customer email for notifications
  const { data: customerData } = useQuery({
    queryKey: ['ticket-customer', ticket.created_by],
    queryFn: async () => {
      const { data, error } = await supabase.auth.admin.getUserById(ticket.created_by);
      if (error) {
        // Fallback to profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', ticket.created_by)
          .single();
        return { email: null, name: profileData?.full_name };
      }
      return { email: data.user?.email, name: data.user?.user_metadata?.full_name };
    },
  });

  const sendEmailNotification = async (type: string, extraData: Record<string, unknown> = {}) => {
    try {
      // Get tenant email
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('contact_email, name')
        .eq('id', ticket.tenant_id)
        .single();

      const customerEmail = tenantData?.contact_email || customerData?.email;
      if (!customerEmail) return;

      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();

      await supabase.functions.invoke('send-support-email', {
        body: {
          type,
          ticket_number: ticket.ticket_number,
          ticket_subject: ticket.subject,
          customer_email: customerEmail,
          customer_name: tenantData?.name || customerData?.name,
          agent_name: profile?.full_name,
          ...extraData,
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  };

  const sendMutation = useMutation({
    mutationFn: async ({ message, isInternal }: { message: string; isInternal: boolean }) => {
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: ticket.id,
        sender_id: user?.id,
        message,
        is_internal: isInternal,
        tenant_id: ticket.tenant_id,
      });
      if (error) throw error;

      // Update ticket status and first_response_at if replying to customer
      if (!isInternal && ticket.status === 'open') {
        const updates: Record<string, unknown> = { status: 'in_progress' };
        if (!ticket.first_response_at) {
          updates.first_response_at = new Date().toISOString();
        }
        await supabase
          .from('support_tickets')
          .update(updates)
          .eq('id', ticket.id);
      }

      // Send email notification for non-internal messages
      if (!isInternal) {
        await sendEmailNotification('new_reply', { reply_message: message });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-messages', ticket.id] });
      setNewMessage('');
      setIsInternal(false);
      toast.success(t('support.messageSent'));
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast.error(t('support.sendError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Ticket>) => {
      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticket.id);
      if (error) throw error;
      return updates;
    },
    onSuccess: async (updates) => {
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      setLocalTicket(prev => ({ ...prev, ...updates }));
      toast.success(t('support.ticketUpdated'));

      // Send notifications
      if (updates.status && updates.status !== ticket.status) {
        await sendEmailNotification('status_changed', {
          old_status: ticket.status,
          new_status: updates.status,
        });
      }
      if (updates.assigned_to && updates.assigned_to !== ticket.assigned_to) {
        // Get agent name
        const { data: agentProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', updates.assigned_to)
          .single();
        
        await sendEmailNotification('ticket_assigned', {
          assigned_to_name: agentProfile?.full_name || 'Support Agent',
        });
      }
    },
    onError: (error) => {
      console.error('Error updating ticket:', error);
      toast.error(t('support.updateError'));
    },
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMutation.mutate({ message: newMessage, isInternal });
  };

  const handleAssignmentChange = (agentId: string | null) => {
    updateMutation.mutate({ assigned_to: agentId } as Partial<Ticket>);
  };

  return (
    <RTLWrapper>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rtl:rotate-180">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">#{ticket.ticket_number}</span>
              <h1 className="text-2xl font-bold">{ticket.subject}</h1>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="gap-1">
                <Building2 className="h-3 w-3" />
                {ticket.tenants?.name || '-'}
              </Badge>
              <Badge variant="outline" className={statusColors[localTicket.status]}>
                {t(`support.statuses.${localTicket.status}`)}
              </Badge>
              <Badge variant="outline" className={priorityColors[localTicket.priority]}>
                {t(`support.priorities.${localTicket.priority}`)}
              </Badge>
              <SLAIndicator
                firstResponseDue={localTicket.sla_first_response_due}
                resolutionDue={localTicket.sla_resolution_due}
                firstResponseAt={localTicket.first_response_at}
                firstResponseBreached={localTicket.sla_first_response_breached}
                resolutionBreached={localTicket.sla_resolution_breached}
                status={localTicket.status}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {/* Original description */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{t('adminSupport.customer')}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(ticket.created_at), 'PPp')}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{ticket.description}</p>
              </CardContent>
            </Card>

            {/* Messages */}
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              messages.map((message) => (
                <Card 
                  key={message.id} 
                  className={`${message.is_internal ? 'border-yellow-500/50 bg-yellow-500/5' : message.sender_id === ticket.created_by ? '' : 'bg-muted/50'}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {message.sender_id === ticket.created_by 
                              ? t('adminSupport.customer') 
                              : t('adminSupport.supportAgent')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(message.created_at), 'PPp')}
                          </p>
                        </div>
                      </div>
                      {message.is_internal && (
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                          {t('adminSupport.internalNote')}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{message.message}</p>
                  </CardContent>
                </Card>
              ))
            )}

            {/* Reply form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('adminSupport.respond')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={isInternal ? t('adminSupport.internalNotePlaceholder') : t('adminSupport.replyPlaceholder')}
                  rows={4}
                  className={isInternal ? 'border-yellow-500/50' : ''}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="internal" 
                      checked={isInternal}
                      onCheckedChange={(checked) => setIsInternal(checked as boolean)}
                    />
                    <Label htmlFor="internal" className="text-sm text-muted-foreground">
                      {t('adminSupport.markInternal')}
                    </Label>
                  </div>
                  <Button 
                    onClick={handleSend} 
                    disabled={sendMutation.isPending || !newMessage.trim()}
                    className="gap-2"
                    variant={isInternal ? 'outline' : 'default'}
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {isInternal ? t('adminSupport.addNote') : t('support.send')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('adminSupport.ticketDetails')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">{t('adminSupport.assignedTo')}</Label>
                  <div className="mt-1">
                    <AgentAssignmentSelect
                      value={localTicket.assigned_to}
                      onValueChange={handleAssignmentChange}
                      disabled={updateMutation.isPending}
                    />
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm text-muted-foreground">{t('adminSupport.status')}</Label>
                  <Select
                    value={localTicket.status}
                    onValueChange={(status) => updateMutation.mutate({ status: status as TicketStatus })}
                  >
                    <SelectTrigger className="mt-1" dir={direction}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir={direction}>
                      <SelectItem value="open">{t('support.statuses.open')}</SelectItem>
                      <SelectItem value="in_progress">{t('support.statuses.in_progress')}</SelectItem>
                      <SelectItem value="waiting_customer">{t('support.statuses.waiting_customer')}</SelectItem>
                      <SelectItem value="resolved">{t('support.statuses.resolved')}</SelectItem>
                      <SelectItem value="closed">{t('support.statuses.closed')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div>
                  <Label className="text-sm text-muted-foreground">{t('adminSupport.priority')}</Label>
                  <Select
                    value={localTicket.priority}
                    onValueChange={(priority) => updateMutation.mutate({ priority: priority as TicketPriority })}
                  >
                    <SelectTrigger className="mt-1" dir={direction}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir={direction}>
                      <SelectItem value="low">{t('support.priorities.low')}</SelectItem>
                      <SelectItem value="medium">{t('support.priorities.medium')}</SelectItem>
                      <SelectItem value="high">{t('support.priorities.high')}</SelectItem>
                      <SelectItem value="urgent">{t('support.priorities.urgent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminSupport.tenant')}</p>
                  <p className="text-sm font-medium">{ticket.tenants?.name || '-'}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">{t('support.created')}</p>
                  <p className="text-sm font-medium">{format(new Date(ticket.created_at), 'PPp')}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">{t('support.lastUpdated')}</p>
                  <p className="text-sm font-medium">{format(new Date(ticket.updated_at), 'PPp')}</p>
                </div>
              </CardContent>
            </Card>

            {/* SLA Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('adminSupport.slaDetails')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminSupport.firstResponse')}</p>
                  {localTicket.first_response_at ? (
                    <p className="text-sm font-medium text-green-600">
                      {t('adminSupport.respondedAt')} {format(new Date(localTicket.first_response_at), 'PPp')}
                    </p>
                  ) : localTicket.sla_first_response_due ? (
                    <p className={`text-sm font-medium ${
                      localTicket.sla_first_response_breached ? 'text-destructive' : ''
                    }`}>
                      {t('adminSupport.dueIn')} {formatDistanceToNow(new Date(localTicket.sla_first_response_due))}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">-</p>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">{t('adminSupport.resolution')}</p>
                  {localTicket.status === 'resolved' || localTicket.status === 'closed' ? (
                    <p className="text-sm font-medium text-green-600">{t('adminSupport.resolved')}</p>
                  ) : localTicket.sla_resolution_due ? (
                    <p className={`text-sm font-medium ${
                      localTicket.sla_resolution_breached ? 'text-destructive' : ''
                    }`}>
                      {t('adminSupport.dueIn')} {formatDistanceToNow(new Date(localTicket.sla_resolution_due))}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">-</p>
                  )}
                </div>
                {(localTicket.sla_first_response_breached || localTicket.sla_resolution_breached) && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">{t('adminSupport.slaBreachedWarning')}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RTLWrapper>
  );
}
