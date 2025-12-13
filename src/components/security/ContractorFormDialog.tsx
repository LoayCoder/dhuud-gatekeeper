import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useCreateContractor, useUpdateContractor, Contractor } from '@/hooks/use-contractors';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  company_name: z.string().optional(),
  mobile_number: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  national_id: z.string().optional(),
  nationality: z.string().optional(),
  preferred_language: z.string().optional(),
  permit_number: z.string().optional(),
  permit_expiry_date: z.string().optional(),
  safety_induction_date: z.string().optional(),
  safety_induction_expiry: z.string().optional(),
  medical_exam_date: z.string().optional(),
  medical_exam_expiry: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const nationalities = [
  'Saudi Arabia', 'UAE', 'Qatar', 'Kuwait', 'Bahrain', 'Oman',
  'India', 'Pakistan', 'Bangladesh', 'Philippines', 'Nepal', 'Sri Lanka',
  'Egypt', 'Jordan', 'Lebanon', 'Syria', 'Yemen', 'Sudan',
  'Indonesia', 'Malaysia', 'Other'
];

const languages = [
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' },
  { value: 'ur', label: 'اردو' },
  { value: 'hi', label: 'हिंदी' },
  { value: 'fil', label: 'Filipino' },
];

interface ContractorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractor?: Contractor | null;
}

export function ContractorFormDialog({ open, onOpenChange, contractor }: ContractorFormDialogProps) {
  const { t } = useTranslation();
  const createContractor = useCreateContractor();
  const updateContractor = useUpdateContractor();
  const isEditing = !!contractor;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      company_name: '',
      mobile_number: '',
      email: '',
      national_id: '',
      nationality: '',
      preferred_language: 'en',
      permit_number: '',
      permit_expiry_date: '',
      safety_induction_date: '',
      safety_induction_expiry: '',
      medical_exam_date: '',
      medical_exam_expiry: '',
    },
  });

  useEffect(() => {
    if (contractor) {
      form.reset({
        full_name: contractor.full_name || '',
        company_name: contractor.company_name || '',
        mobile_number: contractor.mobile_number || '',
        email: contractor.email || '',
        national_id: contractor.national_id || '',
        nationality: contractor.nationality || '',
        preferred_language: contractor.preferred_language || 'en',
        permit_number: contractor.permit_number || '',
        permit_expiry_date: contractor.permit_expiry_date?.split('T')[0] || '',
        safety_induction_date: contractor.safety_induction_date?.split('T')[0] || '',
        safety_induction_expiry: contractor.safety_induction_expiry?.split('T')[0] || '',
        medical_exam_date: contractor.medical_exam_date?.split('T')[0] || '',
        medical_exam_expiry: contractor.medical_exam_expiry?.split('T')[0] || '',
      });
    } else {
      form.reset();
    }
  }, [contractor, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && contractor) {
        await updateContractor.mutateAsync({ id: contractor.id, data: values });
      } else {
        await createContractor.mutateAsync(values);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled in mutation
    }
  };

  const isSubmitting = createContractor.isPending || updateContractor.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('security.contractors.editContractor') : t('security.contractors.addContractor')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.contractors.fullName')} *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.contractors.companyName')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobile_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.contractors.mobile')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.contractors.email')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="national_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.contractors.nationalId')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.contractors.nationality')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.select')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {nationalities.map((nat) => (
                          <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred_language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.contractors.preferredLanguage')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="permit_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.contractors.permitNumber')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="permit_expiry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.contractors.permitExpiry')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="safety_induction_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.contractors.inductionDate')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="safety_induction_expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.contractors.inductionExpiry')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="medical_exam_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.contractors.medicalDate')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="medical_exam_expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('security.contractors.medicalExpiry')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {isEditing ? t('common.save') : t('common.create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
