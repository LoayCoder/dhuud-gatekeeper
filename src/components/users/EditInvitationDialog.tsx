import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

const editInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone_number: z.string().optional(),
  resend_email: z.boolean().default(false),
});

type EditInvitationValues = z.infer<typeof editInvitationSchema>;

interface Invitation {
  id: string;
  email: string;
  code: string;
  expires_at: string;
  phone_number: string | null;
  full_name: string | null;
  metadata: Record<string, unknown> | null;
}

interface EditInvitationDialogProps {
  invitation: Invitation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditInvitationDialog({
  invitation,
  open,
  onOpenChange,
  onSaved,
}: EditInvitationDialogProps) {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const direction = i18n.dir();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EditInvitationValues>({
    resolver: zodResolver(editInvitationSchema),
    defaultValues: {
      email: '',
      phone_number: '',
      resend_email: false,
    },
  });

  useEffect(() => {
    if (invitation) {
      const phone = invitation.phone_number || (invitation.metadata as Record<string, unknown>)?.phone_number;
      form.reset({
        email: invitation.email,
        phone_number: (phone as string) || '',
        resend_email: false,
      });
    }
  }, [invitation, form]);

  const onSubmit = async (data: EditInvitationValues) => {
    if (!invitation) return;

    setIsLoading(true);
    try {
      // Update invitation
      const { error } = await supabase
        .from('invitations')
        .update({
          email: data.email,
          phone_number: data.phone_number || null,
        })
        .eq('id', invitation.id);

      if (error) throw error;

      // Resend email if requested
      if (data.resend_email) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', profile?.tenant_id)
          .single();

        const { error: emailError } = await supabase.functions.invoke('send-invitation-email', {
          body: {
            email: data.email,
            code: invitation.code,
            tenantName: tenant?.name || 'DHUUD Platform',
            expiresAt: invitation.expires_at,
            inviteUrl: window.location.origin,
          },
        });

        if (emailError) {
          console.error('Failed to resend email:', emailError);
          toast({
            title: t('invitations.updated', 'Invitation updated'),
            description: t('invitations.emailResendFailed', 'But failed to resend email'),
          });
        } else {
          // Update delivery status
          await supabase
            .from('invitations')
            .update({
              delivery_status: 'sent',
              email_sent_at: new Date().toISOString(),
              last_send_error: null,
            })
            .eq('id', invitation.id);

          toast({ title: t('invitations.updatedAndResent', 'Invitation updated and email resent') });
        }
      } else {
        toast({ title: t('invitations.updated', 'Invitation updated') });
      }

      onSaved();
    } catch (error) {
      console.error('Failed to update invitation:', error);
      toast({
        title: t('common.error'),
        description: t('invitations.updateFailed', 'Failed to update invitation'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir={direction}>
        <DialogHeader className="text-start">
          <DialogTitle className="text-start">
            {t('invitations.editInvitation', 'Edit Invitation')}
          </DialogTitle>
          <DialogDescription className="text-start">
            {t('invitations.editInvitationDesc', 'Update the email or phone number for this pending invitation.')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.email', 'Email')}</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile.phoneNumber', 'Phone Number')}</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+966..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="resend_email"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rtl:space-x-reverse">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t('invitations.resendAfterUpdate', 'Resend invitation email after update')}
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {t('common.save', 'Save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
