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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useCreateWarrantyClaim, generateClaimNumber } from '@/hooks/use-warranty-claims';

const formSchema = z.object({
  claim_number: z.string().min(1, 'Claim number is required'),
  claim_date: z.string().min(1, 'Claim date is required'),
  issue_description: z.string().min(10, 'Please provide a detailed description'),
  vendor_name: z.string().optional(),
  vendor_contact: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface WarrantyClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  assetName?: string;
}

export function WarrantyClaimDialog({
  open,
  onOpenChange,
  assetId,
  assetName,
}: WarrantyClaimDialogProps) {
  const { t, i18n } = useTranslation();
  const { mutate, isPending } = useCreateWarrantyClaim();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      claim_number: generateClaimNumber(),
      claim_date: new Date().toISOString().split('T')[0],
      issue_description: '',
      vendor_name: '',
      vendor_contact: '',
    },
  });

  const onSubmit = (data: FormData) => {
    mutate(
      {
        asset_id: assetId,
        claim_number: data.claim_number,
        claim_date: data.claim_date,
        issue_description: data.issue_description,
        vendor_name: data.vendor_name || undefined,
        vendor_contact: data.vendor_contact || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          form.reset({
            claim_number: generateClaimNumber(),
            claim_date: new Date().toISOString().split('T')[0],
            issue_description: '',
            vendor_name: '',
            vendor_contact: '',
          });
        },
      }
    );
  };

  const handleClose = () => {
    if (!isPending) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]" dir={i18n.dir()}>
        <DialogHeader>
          <DialogTitle>{t('assets.warranty.fileClaimTitle')}</DialogTitle>
          <DialogDescription>
            {assetName
              ? t('assets.warranty.fileClaimDescriptionWithAsset', { asset: assetName })
              : t('assets.warranty.fileClaimDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="claim_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('assets.warranty.claimNumber')}</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly className="bg-muted" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="claim_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('assets.warranty.claimDate')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="issue_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.warranty.issueDescription')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t('assets.warranty.issueDescriptionPlaceholder')}
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendor_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('assets.warranty.vendorName')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('assets.warranty.vendorNamePlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vendor_contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('assets.warranty.vendorContact')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('assets.warranty.vendorContactPlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t('common.loading') : t('assets.warranty.submitClaim')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
