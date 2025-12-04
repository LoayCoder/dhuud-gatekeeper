import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RTLWrapper } from '@/components/RTLWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ArrowLeft, Send, Loader2, User } from 'lucide-react';
import { format } from 'date-fns';

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

interface Message {
  id: string;
  message: string;
  sender_id: string;
  is_internal: boolean;
  created_at: string;
}

interface TicketDetailProps {
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

export function TicketDetail({ ticket, onBack }: TicketDetailProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['ticket-messages', ticket.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('id, message, sender_id, is_internal, created_at')
        .eq('ticket_id', ticket.id)
        .eq('is_internal', false)  // Server-side filter - regular users don't see internal notes
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const { error } = await supabase.from('ticket_messages').insert({
        ticket_id: ticket.id,
        sender_id: user?.id,
        message,
        is_internal: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticket.id] });
      setNewMessage('');
      toast.success(t('support.messageSent'));
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast.error(t('support.sendError'));
    },
  });

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMutation.mutate(newMessage);
  };

  const isTicketClosed = ticket.status === 'closed' || ticket.status === 'resolved';

  return (
    <RTLWrapper>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">#{ticket.ticket_number}</span>
              <h1 className="text-2xl font-bold">{ticket.subject}</h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={statusColors[ticket.status]}>
                {t(`support.statuses.${ticket.status}`)}
              </Badge>
              <Badge variant="outline" className={priorityColors[ticket.priority]}>
                {t(`support.priorities.${ticket.priority}`)}
              </Badge>
              <Badge variant="outline">
                {t(`support.categories.${ticket.category}`)}
              </Badge>
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
                    <p className="text-sm font-medium">{t('support.you')}</p>
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
                <Card key={message.id} className={message.sender_id !== user?.id ? 'bg-muted/50' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {message.sender_id === user?.id ? t('support.you') : t('support.supportTeam')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(message.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{message.message}</p>
                  </CardContent>
                </Card>
              ))
            )}

            {/* Reply form */}
            {!isTicketClosed && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('support.reply')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('support.replyPlaceholder')}
                    rows={4}
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleSend} 
                      disabled={sendMutation.isPending || !newMessage.trim()}
                      className="gap-2"
                    >
                      {sendMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {t('support.send')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isTicketClosed && (
              <Card className="bg-muted/50">
                <CardContent className="py-4 text-center text-muted-foreground">
                  {t('support.ticketClosed')}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('support.details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('support.created')}</p>
                  <p className="text-sm font-medium">{format(new Date(ticket.created_at), 'PPp')}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">{t('support.lastUpdated')}</p>
                  <p className="text-sm font-medium">{format(new Date(ticket.updated_at), 'PPp')}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">{t('support.category')}</p>
                  <p className="text-sm font-medium">{t(`support.categories.${ticket.category}`)}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">{t('support.priority')}</p>
                  <Badge variant="outline" className={priorityColors[ticket.priority]}>
                    {t(`support.priorities.${ticket.priority}`)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RTLWrapper>
  );
}
