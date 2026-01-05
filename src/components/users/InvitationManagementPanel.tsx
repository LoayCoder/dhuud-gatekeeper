import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Mail,
  MessageCircle,
  Pencil,
  Trash2,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Users,
  Upload,
} from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { EditInvitationDialog } from './EditInvitationDialog';
import { BulkInvitationImportDialog } from './BulkInvitationImportDialog';

interface Invitation {
  id: string;
  email: string;
  code: string;
  expires_at: string;
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  delivery_status: string | null;
  delivery_channel: string | null;
  email_sent_at: string | null;
  whatsapp_sent_at: string | null;
  last_send_error: string | null;
  full_name: string | null;
  phone_number: string | null;
}

export function InvitationManagementPanel() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const direction = i18n.dir();
  const locale = i18n.language === 'ar' ? ar : enUS;

  const [isOpen, setIsOpen] = useState(true);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const fetchInvitations = useCallback(async () => {
    if (!profile?.tenant_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('id, email, code, expires_at, used, created_at, delivery_status, delivery_channel, email_sent_at, whatsapp_sent_at, last_send_error, full_name, phone_number, metadata')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .eq('used', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
      toast({
        title: t('common.error'),
        description: t('invitations.fetchFailed', 'Failed to load invitations'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id, t]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast({ title: t('invitations.codeCopied', 'Code copied to clipboard') });
  };

  const copyLink = async (code: string) => {
    const link = `${window.location.origin}/signup?code=${code}`;
    await navigator.clipboard.writeText(link);
    toast({ title: t('invitations.linkCopied', 'Invitation link copied') });
  };

  const resendEmail = async (invitation: Invitation) => {
    setActionLoading(invitation.id);
    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', profile?.tenant_id)
        .single();

      const { error } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          email: invitation.email,
          code: invitation.code,
          tenantName: tenant?.name || 'DHUUD Platform',
          expiresAt: invitation.expires_at,
          inviteUrl: window.location.origin,
        },
      });

      if (error) throw error;

      // Update delivery status
      await supabase
        .from('invitations')
        .update({
          delivery_status: 'sent',
          email_sent_at: new Date().toISOString(),
          last_send_error: null,
        })
        .eq('id', invitation.id);

      toast({ title: t('invitations.emailResent', 'Invitation email resent') });
      fetchInvitations();
    } catch (error) {
      console.error('Failed to resend email:', error);
      toast({
        title: t('common.error'),
        description: t('invitations.emailFailed', 'Failed to send email'),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const sendWhatsApp = async (invitation: Invitation) => {
    const phone = invitation.phone_number || (invitation.metadata as Record<string, unknown>)?.phone_number;
    if (!phone) {
      toast({
        title: t('common.error'),
        description: t('invitations.noPhone', 'No phone number available'),
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(invitation.id);
    try {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', profile?.tenant_id)
        .single();

      const { data, error } = await supabase.functions.invoke('send-invitation-whatsapp', {
        body: {
          invitation_id: invitation.id,
          phone_number: phone,
          code: invitation.code,
          tenant_name: tenant?.name || 'DHUUD Platform',
          expires_at: invitation.expires_at,
          full_name: invitation.full_name || (invitation.metadata as Record<string, unknown>)?.full_name,
          invite_url: window.location.origin,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to send WhatsApp');

      toast({ title: t('invitations.whatsappSent', 'WhatsApp invitation sent') });
      fetchInvitations();
    } catch (error) {
      console.error('Failed to send WhatsApp:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('invitations.whatsappFailed', 'Failed to send WhatsApp'),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const revokeInvitation = async (invitation: Invitation) => {
    setActionLoading(invitation.id);
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (error) throw error;

      toast({ title: t('invitations.revoked', 'Invitation revoked') });
      fetchInvitations();
    } catch (error) {
      console.error('Failed to revoke invitation:', error);
      toast({
        title: t('common.error'),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (invitation: Invitation) => {
    const isExpired = isPast(new Date(invitation.expires_at));
    
    if (isExpired) {
      return (
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
          <AlertTriangle className="h-3 w-3 me-1" />
          {t('invitations.expired', 'Expired')}
        </Badge>
      );
    }

    switch (invitation.delivery_status) {
      case 'sent':
        return (
          <Badge variant="outline" className="bg-info/10 text-info border-info/30">
            <CheckCircle2 className="h-3 w-3 me-1" />
            {t('invitations.sent', 'Sent')}
          </Badge>
        );
      case 'failed':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 cursor-help">
                  <XCircle className="h-3 w-3 me-1" />
                  {t('invitations.failed', 'Failed')}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">{invitation.last_send_error || 'Unknown error'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            <Clock className="h-3 w-3 me-1" />
            {t('invitations.pending', 'Pending')}
          </Badge>
        );
    }
  };

  const getChannelIcon = (invitation: Invitation) => {
    const channel = invitation.delivery_channel || 'email';
    
    if (channel === 'both') {
      return (
        <div className="flex items-center gap-1">
          <Mail className="h-4 w-4 text-primary" />
          <MessageCircle className="h-4 w-4 text-success" />
        </div>
      );
    }
    
    if (channel === 'whatsapp') {
      return <MessageCircle className="h-4 w-4 text-success" />;
    }
    
    return <Mail className="h-4 w-4 text-primary" />;
  };

  const getExpiryInfo = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const isExpired = isPast(expiryDate);
    const daysLeft = differenceInDays(expiryDate, new Date());

    if (isExpired) {
      return <span className="text-destructive">{t('invitations.expired', 'Expired')}</span>;
    }

    if (daysLeft <= 1) {
      return <span className="text-warning">{t('invitations.expiresSoon', 'Expires soon')}</span>;
    }

    return <span className="text-muted-foreground">{format(expiryDate, 'PP', { locale })}</span>;
  };

  const pendingCount = invitations.filter(inv => !isPast(new Date(inv.expires_at))).length;

  return (
    <>
      <Card className="mb-6">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('invitations.pendingInvitations', 'Pending Invitations')}
                  {pendingCount > 0 && (
                    <Badge variant="secondary" className="ms-2">
                      {pendingCount}
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBulkImportOpen(true);
                    }}
                  >
                    <Upload className="h-4 w-4 me-2" />
                    {t('bulkImport.import', 'Bulk Import')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchInvitations();
                    }}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                  {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : invitations.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  {t('invitations.noPending', 'No pending invitations')}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('profile.fullName', 'Name')}</TableHead>
                        <TableHead>{t('auth.email', 'Email')}</TableHead>
                        <TableHead>{t('profile.phoneNumber', 'Phone')}</TableHead>
                        <TableHead>{t('invitations.code', 'Code')}</TableHead>
                        <TableHead className="text-center">{t('invitations.channel', 'Channel')}</TableHead>
                        <TableHead>{t('invitations.status', 'Status')}</TableHead>
                        <TableHead>{t('invitations.expires', 'Expires')}</TableHead>
                        <TableHead className="text-end">{t('common.actions', 'Actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((invitation) => {
                        const phone = invitation.phone_number || (invitation.metadata as Record<string, unknown>)?.phone_number;
                        const name = invitation.full_name || (invitation.metadata as Record<string, unknown>)?.full_name;
                        const isExpired = isPast(new Date(invitation.expires_at));
                        const isLoading = actionLoading === invitation.id;

                        return (
                          <TableRow key={invitation.id} className={isExpired ? 'opacity-60' : ''}>
                            <TableCell className="font-medium">
                              {name as string || '-'}
                            </TableCell>
                            <TableCell>{invitation.email}</TableCell>
                            <TableCell>{phone as string || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                  {invitation.code}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => copyCode(invitation.code)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {getChannelIcon(invitation)}
                            </TableCell>
                            <TableCell>{getStatusBadge(invitation)}</TableCell>
                            <TableCell>{getExpiryInfo(invitation.expires_at)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                {!isExpired && (
                                  <>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setEditingInvitation(invitation)}
                                            disabled={isLoading}
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {t('invitations.editEmail', 'Edit Email')}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>

                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => resendEmail(invitation)}
                                            disabled={isLoading}
                                          >
                                            {isLoading ? (
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                              <Mail className="h-4 w-4" />
                                            )}
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {t('invitations.resendEmail', 'Resend Email')}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>

                                    {phone && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-success hover:text-success"
                                              onClick={() => sendWhatsApp(invitation)}
                                              disabled={isLoading}
                                            >
                                              {isLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <MessageCircle className="h-4 w-4" />
                                              )}
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            {t('invitations.sendWhatsApp', 'Send via WhatsApp')}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}

                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => copyLink(invitation.code)}
                                            disabled={isLoading}
                                          >
                                            <Copy className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {t('invitations.copyLink', 'Copy Invite Link')}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </>
                                )}

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => revokeInvitation(invitation)}
                                        disabled={isLoading}
                                      >
                                        {isLoading ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {t('invitations.revoke', 'Revoke')}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <EditInvitationDialog
        invitation={editingInvitation}
        open={!!editingInvitation}
        onOpenChange={(open) => !open && setEditingInvitation(null)}
        onSaved={() => {
          setEditingInvitation(null);
          fetchInvitations();
        }}
      />

      <BulkInvitationImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        onSuccess={() => {
          setBulkImportOpen(false);
          fetchInvitations();
        }}
      />
    </>
  );
}
