import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useWhitelistIP } from '@/features/admin/hooks/use-rate-limit-stats';

const whitelistIPSchema = z.object({
  ip_address: z
    .string()
    .min(7, 'Invalid IP address')
    .regex(/^[\d.:a-fA-F]+$/, 'Invalid IP address format'),
  duration: z.string(),
  reason: z.string().min(3, 'Reason is required').max(500),
});

type WhitelistIPFormData = z.infer<typeof whitelistIPSchema>;

interface WhitelistIPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultIP?: string;
}

const DURATION_OPTIONS = [
  { value: 'permanent', label: 'Permanent' },
  { value: '24', label: '24 hours' },
  { value: '168', label: '7 days' },
  { value: '720', label: '30 days' },
  { value: '2160', label: '90 days' },
];

export function WhitelistIPDialog({ open, onOpenChange, defaultIP }: WhitelistIPDialogProps) {
  const { t } = useTranslation();
  const whitelistMutation = useWhitelistIP();
  
  const form = useForm<WhitelistIPFormData>({
    resolver: zodResolver(whitelistIPSchema),
    defaultValues: {
      ip_address: defaultIP || '',
      duration: 'permanent',
      reason: '',
    },
  });

  const onSubmit = async (data: WhitelistIPFormData) => {
    const durationHours = data.duration === 'permanent' ? undefined : parseInt(data.duration);
    
    await whitelistMutation.mutateAsync({
      ip_address: data.ip_address,
      reason: data.reason,
      duration_hours: durationHours,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            {t('admin.whitelistIPAddress', 'Whitelist IP Address')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.whitelistIPDesc', 'Whitelisted IPs bypass all rate limiting and blocking. Use with caution.')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="ip_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.ipAddress', 'IP Address')}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="192.168.1.100" 
                      {...field} 
                      className="font-mono"
                    />
                  </FormControl>
                  <FormDescription>
                    {t('admin.ipAddressDesc', 'IPv4 or IPv6 address')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.duration', 'Duration')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('admin.selectDuration', 'Select duration')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DURATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.reason', 'Reason')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t('admin.whitelistReasonPlaceholder', 'Why should this IP be whitelisted?')}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button 
                type="submit"
                disabled={whitelistMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {whitelistMutation.isPending && (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                )}
                {t('admin.whitelist', 'Whitelist')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
