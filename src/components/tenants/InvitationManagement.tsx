import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Copy, CheckCircle2, XCircle, Clock, Loader2, Mail, Send } from 'lucide-react';
import { format, addDays, isPast } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import type { Tables } from '@/integrations/supabase/types';

type Tenant = Tables<'tenants'>;
type Invitation = Tables<'invitations'>;

interface InvitationManagementProps {
  tenant: Tenant;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function InvitationManagement({ tenant }: InvitationManagementProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newEmail, setNewEmail] = useState('');
  const [expiryDays, setExpiryDays] = useState(7);
  const [sendEmail, setSendEmail] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invitationToDelete, setInvitationToDelete] = useState<Invitation | null>(null);

  // Fetch invitations for this tenant
  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['invitations', tenant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('id, email, code, expires_at, used, created_at')
        .eq('tenant_id', tenant.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Invitation[];
    },
  });

  // Create invitation mutation
  const createMutation = useMutation({
    mutationFn: async ({ email, expiryDays, sendEmail }: { email: string; expiryDays: number; sendEmail: boolean }) => {
      const code = generateCode();
      const expires_at = addDays(new Date(), expiryDays).toISOString();
      
      const { data, error } = await supabase
        .from('invitations')
        .insert([{
          code,
          email: email.toLowerCase().trim(),
          tenant_id: tenant.id,
          expires_at,
          used: false,
        }])
        .select()
        .single();
      if (error) throw error;

      // Send email if enabled
      if (sendEmail) {
        try {
          // Get current session for auth header
          const { data: { session } } = await supabase.auth.getSession();
          
          const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-invitation-email', {
            body: {
              email: email.toLowerCase().trim(),
              code,
              tenantName: tenant.name,
              expiresAt: expires_at,
              inviteUrl: window.location.origin,
            },
            headers: session?.access_token ? {
              Authorization: `Bearer ${session.access_token}`,
            } : undefined,
          });
          
          if (emailError) {
            console.error('Failed to send invitation email:', emailError);
            // Don't throw - invitation was created successfully
          } else {
            console.log('Invitation email sent:', emailResult);
          }
        } catch (e) {
          console.error('Error invoking email function:', e);
        }
      }

      return { ...data, emailSent: sendEmail };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', tenant.id] });
      setNewEmail('');
      toast({
        title: t('invitations.toast.created'),
        description: data.emailSent 
          ? t('invitations.toast.createdWithEmail', { code: data.code, email: data.email })
          : t('invitations.toast.createdDescription', { code: data.code }),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete invitation mutation (Soft Delete)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - set deleted_at timestamp
      const { error } = await supabase
        .from('invitations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', tenant.id] });
      setDeleteDialogOpen(false);
      setInvitationToDelete(null);
      toast({
        title: t('invitations.toast.revoked'),
        description: t('invitations.toast.revokedDescription'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    if (!newEmail.trim()) return;
    createMutation.mutate({ email: newEmail, expiryDays, sendEmail });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: t('invitations.toast.copied'),
      description: t('invitations.toast.copiedDescription'),
    });
  };

  const handleDeleteClick = (invitation: Invitation) => {
    setInvitationToDelete(invitation);
    setDeleteDialogOpen(true);
  };

  // Resend email mutation
  const resendMutation = useMutation({
    mutationFn: async (invitation: Invitation) => {
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          email: invitation.email,
          code: invitation.code,
          tenantName: tenant.name,
          expiresAt: invitation.expires_at,
          inviteUrl: window.location.origin,
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
      });
      if (error) throw error;
      return invitation;
    },
    onSuccess: (invitation) => {
      toast({
        title: t('invitations.toast.emailResent'),
        description: t('invitations.toast.emailResentDescription', { email: invitation.email }),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDeleteConfirm = () => {
    if (invitationToDelete) {
      deleteMutation.mutate(invitationToDelete.id);
    }
  };

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.used) {
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {t('invitations.status.used')}
        </Badge>
      );
    }
    if (isPast(new Date(invitation.expires_at))) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          {t('invitations.status.expired')}
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="gap-1">
        <Clock className="h-3 w-3" />
        {t('invitations.status.pending')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Create new invitation */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-medium">{t('invitations.createNew')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="email">{t('invitations.fields.email')}</Label>
            <Input
              id="email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={t('invitations.placeholders.email')}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div>
            <Label htmlFor="expiry">{t('invitations.fields.expiryDays')}</Label>
            <Input
              id="expiry"
              type="number"
              min={1}
              max={90}
              value={expiryDays}
              onChange={(e) => setExpiryDays(parseInt(e.target.value) || 7)}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="sendEmail" 
              checked={sendEmail} 
              onCheckedChange={(checked) => setSendEmail(checked === true)}
            />
            <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t('invitations.sendEmailOnCreate')}
            </Label>
          </div>
        </div>
        <Button 
          onClick={handleCreate} 
          disabled={!newEmail.trim() || createMutation.isPending}
        >
          {createMutation.isPending ? (
            <Loader2 className="h-4 w-4 me-2 animate-spin" />
          ) : sendEmail ? (
            <Send className="h-4 w-4 me-2" />
          ) : (
            <Plus className="h-4 w-4 me-2" />
          )}
          {t('invitations.createInvitation')}
        </Button>
      </div>

      {/* Invitations list */}
      <div>
        <h3 className="font-medium mb-3">{t('invitations.existingInvitations')}</h3>
        
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            {t('invitations.noInvitations')}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('invitations.columns.code')}</TableHead>
                  <TableHead>{t('invitations.columns.email')}</TableHead>
                  <TableHead>{t('invitations.columns.expires')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-end">{t('orgStructure.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                          {invitation.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopyCode(invitation.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>{getStatusBadge(invitation)}</TableCell>
                    <TableCell className="text-end">
                      <div className="flex items-center justify-end gap-1">
                        {!invitation.used && !isPast(new Date(invitation.expires_at)) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => resendMutation.mutate(invitation)}
                            disabled={resendMutation.isPending}
                            title={t('invitations.resendEmail')}
                          >
                            {resendMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(invitation)}
                          disabled={invitation.used}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('invitations.revokeDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('invitations.revokeDialog.description', { email: invitationToDelete?.email })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('invitations.revokeDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
