import { useState } from 'react';
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
import { Ban, Loader2 } from 'lucide-react';
import { useBlockIP } from '@/features/admin/hooks/use-rate-limit-stats';

const blockIPSchema = z.object({
  ip_address: z
    .string()
    .min(7, 'Invalid IP address')
    .regex(/^[\d.:a-fA-F]+$/, 'Invalid IP address format'),
  block_type: z.enum(['temporary', 'permanent']),
  duration_hours: z.number().optional(),
  reason: z.string().min(3, 'Reason is required').max(500),
});

type BlockIPFormData = z.infer<typeof blockIPSchema>;

interface BlockIPDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultIP?: string;
}

const DURATION_OPTIONS = [
  { value: 1, label: '1 hour' },
  { value: 6, label: '6 hours' },
  { value: 24, label: '24 hours' },
  { value: 168, label: '7 days' },
  { value: 720, label: '30 days' },
];

export function BlockIPDialog({ open, onOpenChange, defaultIP }: BlockIPDialogProps) {
  const { t } = useTranslation();
  const blockMutation = useBlockIP();
  
  const form = useForm<BlockIPFormData>({
    resolver: zodResolver(blockIPSchema),
    defaultValues: {
      ip_address: defaultIP || '',
      block_type: 'temporary',
      duration_hours: 24,
      reason: '',
    },
  });

  const blockType = form.watch('block_type');

  const onSubmit = async (data: BlockIPFormData) => {
    await blockMutation.mutateAsync({
      ip_address: data.ip_address,
      block_type: data.block_type,
      reason: data.reason,
      duration_hours: data.block_type === 'temporary' ? data.duration_hours : undefined,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            {t('admin.blockIPAddress', 'Block IP Address')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.blockIPDesc', 'Block an IP address from making visitor registration requests.')}
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
              name="block_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.blockType', 'Block Type')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('admin.selectBlockType', 'Select block type')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="temporary">
                        {t('admin.temporary', 'Temporary')}
                      </SelectItem>
                      <SelectItem value="permanent">
                        {t('admin.permanent', 'Permanent')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {blockType === 'temporary' && (
              <FormField
                control={form.control}
                name="duration_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('admin.duration', 'Duration')}</FormLabel>
                    <Select 
                      onValueChange={(v) => field.onChange(parseInt(v))} 
                      defaultValue={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('admin.selectDuration', 'Select duration')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DURATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {opt.label}
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
                  <FormLabel>{t('admin.reason', 'Reason')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t('admin.blockReasonPlaceholder', 'Why is this IP being blocked?')}
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
                variant="destructive"
                disabled={blockMutation.isPending}
              >
                {blockMutation.isPending && (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                )}
                {t('admin.blockIP', 'Block IP')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
