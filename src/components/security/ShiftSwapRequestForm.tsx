import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowRightLeft, Calendar, User } from 'lucide-react';
import { useCreateSwapRequest } from '@/hooks/use-shift-swap-requests';
import { useShiftRoster } from '@/hooks/use-shift-roster';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const swapRequestSchema = z.object({
  original_roster_id: z.string().min(1, 'Select a shift to swap'),
  target_guard_id: z.string().min(1, 'Select a guard to swap with'),
  swap_roster_id: z.string().optional(),
  reason: z.string().min(10, 'Please provide a reason (min 10 characters)'),
});

type SwapRequestFormData = z.infer<typeof swapRequestSchema>;

interface ShiftSwapRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ShiftSwapRequestForm({ onSuccess, onCancel }: ShiftSwapRequestFormProps) {
  const { t } = useTranslation();
  const createRequest = useCreateSwapRequest();
  const { data: allRoster } = useShiftRoster();
  const [selectedGuardId, setSelectedGuardId] = useState<string | null>(null);

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Get current user's roster entries (future dates only)
  const myRoster = allRoster?.filter(
    r => r.guard_id === currentUser?.id && 
    new Date(r.roster_date) >= new Date(format(new Date(), 'yyyy-MM-dd'))
  ) || [];

  // Get other guards with roster entries
  const { data: guards } = useQuery({
    queryKey: ['guards-with-roster', currentUser?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) return [];

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('tenant_id', profile.tenant_id)
        .neq('id', user.id)
        .is('deleted_at', null);

      return data || [];
    },
    enabled: !!currentUser,
  });

  // Get target guard's roster entries
  const targetGuardRoster = allRoster?.filter(
    r => r.guard_id === selectedGuardId && 
    new Date(r.roster_date) >= new Date(format(new Date(), 'yyyy-MM-dd'))
  ) || [];

  const form = useForm<SwapRequestFormData>({
    resolver: zodResolver(swapRequestSchema),
    defaultValues: {
      original_roster_id: '',
      target_guard_id: '',
      swap_roster_id: '',
      reason: '',
    },
  });

  const onSubmit = async (data: SwapRequestFormData) => {
    await createRequest.mutateAsync({
      target_guard_id: data.target_guard_id,
      original_roster_id: data.original_roster_id,
      swap_roster_id: data.swap_roster_id || undefined,
      reason: data.reason,
    });
    onSuccess?.();
  };

  useEffect(() => {
    const targetGuard = form.watch('target_guard_id');
    if (targetGuard !== selectedGuardId) {
      setSelectedGuardId(targetGuard || null);
      form.setValue('swap_roster_id', '');
    }
  }, [form.watch('target_guard_id')]);

  const formatRosterOption = (roster: any) => {
    const date = format(new Date(roster.roster_date), 'EEE, MMM d');
    const zone = roster.security_zones?.zone_name || 'Unknown zone';
    const shift = roster.security_shifts?.name || 'Unknown shift';
    return `${date} - ${zone} (${shift})`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          {t('security.swapRequest.title', 'Request Shift Swap')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="original_roster_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('security.swapRequest.myShift', 'My Shift to Swap')}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('security.swapRequest.selectShift', 'Select your shift')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {myRoster.map(r => (
                        <SelectItem key={r.id} value={r.id}>
                          {formatRosterOption(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_guard_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t('security.swapRequest.swapWith', 'Swap With Guard')}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('security.swapRequest.selectGuard', 'Select a guard')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {guards?.map(g => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedGuardId && targetGuardRoster.length > 0 && (
              <FormField
                control={form.control}
                name="swap_roster_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('security.swapRequest.theirShift', 'Their Shift (Optional)')}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('security.swapRequest.selectTheirShift', 'Select shift to take')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">
                          {t('security.swapRequest.noExchange', 'No exchange (just take my shift)')}
                        </SelectItem>
                        {targetGuardRoster.map(r => (
                          <SelectItem key={r.id} value={r.id}>
                            {formatRosterOption(r)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('security.swapRequest.reason', 'Reason for Swap')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('security.swapRequest.reasonPlaceholder', 'Explain why you need to swap this shift...')}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  {t('common.cancel', 'Cancel')}
                </Button>
              )}
              <Button type="submit" disabled={createRequest.isPending}>
                {createRequest.isPending 
                  ? t('common.sending', 'Sending...') 
                  : t('security.swapRequest.submit', 'Send Request')
                }
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
