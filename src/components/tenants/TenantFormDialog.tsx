import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Tenant = Tables<'tenants'>;

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  industry: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  contact_person: z.string().max(100).optional().nullable(),
  contact_email: z.string().email().optional().or(z.literal('')).nullable(),
  contact_phone: z.string().max(20).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  onSubmit: (values: Partial<Tenant> & { name: string; slug: string }) => void;
  isSubmitting: boolean;
}

export function TenantFormDialog({ open, onOpenChange, tenant, onSubmit, isSubmitting }: TenantFormDialogProps) {
  const { t } = useTranslation();
  const isEditing = !!tenant;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      slug: '',
      industry: '',
      country: '',
      city: '',
      contact_person: '',
      contact_email: '',
      contact_phone: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (tenant) {
      form.reset({
        name: tenant.name,
        slug: tenant.slug,
        industry: tenant.industry || '',
        country: tenant.country || '',
        city: tenant.city || '',
        contact_person: tenant.contact_person || '',
        contact_email: tenant.contact_email || '',
        contact_phone: tenant.contact_phone || '',
        notes: tenant.notes || '',
      });
    } else {
      form.reset({
        name: '',
        slug: '',
        industry: '',
        country: '',
        city: '',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        notes: '',
      });
    }
  }, [tenant, form]);

  const handleSubmit = (values: FormValues) => {
    const cleanedValues = {
      name: values.name,
      slug: values.slug,
      industry: values.industry || null,
      country: values.country || null,
      city: values.city || null,
      contact_person: values.contact_person || null,
      contact_email: values.contact_email || null,
      contact_phone: values.contact_phone || null,
      notes: values.notes || null,
    };
    onSubmit(cleanedValues);
  };

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    form.setValue('name', name);
    if (!isEditing) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      form.setValue('slug', slug);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('tenantManagement.editTenant') : t('tenantManagement.addTenant')}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t('tenantManagement.editDescription') : t('tenantManagement.addDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenantManagement.fields.name')} *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder={t('tenantManagement.placeholders.name')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Slug */}
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenantManagement.fields.slug')} *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('tenantManagement.placeholders.slug')}
                        disabled={isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Industry */}
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenantManagement.fields.industry')}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder={t('tenantManagement.placeholders.industry')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Country */}
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenantManagement.fields.country')}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder={t('tenantManagement.placeholders.country')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* City */}
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenantManagement.fields.city')}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder={t('tenantManagement.placeholders.city')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Person */}
              <FormField
                control={form.control}
                name="contact_person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenantManagement.fields.contactPerson')}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder={t('tenantManagement.placeholders.contactPerson')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Email */}
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenantManagement.fields.contactEmail')}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} type="email" placeholder={t('tenantManagement.placeholders.contactEmail')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Phone */}
              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('tenantManagement.fields.contactPhone')}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder={t('tenantManagement.placeholders.contactPhone')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tenantManagement.fields.notes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ''}
                      placeholder={t('tenantManagement.placeholders.notes')}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {isEditing ? t('common.save') : t('tenantManagement.addTenant')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
