import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, UserPlus, QrCode, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCreateVisitor } from '@/hooks/use-visitors';
import { useCreateVisitRequest } from '@/hooks/use-visit-requests';
import { useSites } from '@/hooks/use-sites';
import { useAuth } from '@/contexts/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { VisitorIdScanner } from '@/components/visitors/VisitorIdScanner';

const DURATION_OPTIONS = [
  { value: '10', label: '10 minutes', minutes: 10 },
  { value: '30', label: '30 minutes', minutes: 30 },
  { value: '60', label: '1 hour', minutes: 60 },
  { value: '120', label: '2 hours', minutes: 120 },
  { value: '240', label: '4 hours', minutes: 240 },
  { value: '480', label: '8 hours', minutes: 480 },
];

const formSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  phone: z.string().min(8, 'Valid phone number is required').optional().or(z.literal('')),
  company_name: z.string().optional(),
  national_id: z.string().optional(),
  site_id: z.string().min(1, 'Site is required'),
  valid_from: z.string().min(1, 'Start date is required'),
  duration_minutes: z.string().min(1, 'Duration is required'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function VisitorPreRegistration() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [createdVisitor, setCreatedVisitor] = useState<{ qr_code_token: string; full_name: string } | null>(null);
  
  const { data: sites } = useSites();
  const createVisitor = useCreateVisitor();
  const createVisitRequest = useCreateVisitRequest();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      company_name: '',
      national_id: '',
      site_id: '',
      valid_from: new Date().toISOString().slice(0, 16),
      duration_minutes: '10', // Default 10 minutes
      notes: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      // Calculate valid_until from valid_from + duration
      const validFromDate = new Date(values.valid_from);
      const durationMinutes = parseInt(values.duration_minutes, 10);
      const validUntilDate = new Date(validFromDate.getTime() + durationMinutes * 60 * 1000);

      // First create the visitor
      const visitor = await createVisitor.mutateAsync({
        full_name: values.full_name,
        phone: values.phone || null,
        company_name: values.company_name || null,
        national_id: values.national_id || null,
      });

      // Then create the visit request
      await createVisitRequest.mutateAsync({
        visitor_id: visitor.id,
        host_id: user?.id ?? '',
        site_id: values.site_id,
        valid_from: values.valid_from,
        valid_until: validUntilDate.toISOString(),
        security_notes: values.notes || null,
      });

      setCreatedVisitor({
        qr_code_token: visitor.qr_code_token,
        full_name: visitor.full_name,
      });
    } catch (error) {
      // Error is handled by mutation
    }
  };

  const handleIdScan = (scannedValue: string) => {
    form.setValue('national_id', scannedValue);
  };

  if (createdVisitor) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <CardTitle>{t('visitors.register.success')}</CardTitle>
            <CardDescription>{t('visitors.register.successDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="font-medium mb-4">{createdVisitor.full_name}</p>
              <div className="inline-block p-4 bg-white rounded-lg">
                <QRCodeSVG value={`VISITOR:${createdVisitor.qr_code_token}`} size={200} />
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                {t('visitors.register.qrInstructions')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreatedVisitor(null)}>
                {t('visitors.register.registerAnother')}
              </Button>
              <Button className="flex-1" onClick={() => navigate('/visitors')}>
                {t('visitors.register.backToDashboard')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/visitors')}>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t('visitors.register.title')}</h1>
          <p className="text-muted-foreground">{t('visitors.register.description')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t('visitors.register.form.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Visitor Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">{t('visitors.register.sections.visitor')}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('visitors.fields.name')} *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('visitors.placeholders.name')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('visitors.fields.phone', 'Mobile Number')}</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="tel" 
                            placeholder={t('visitors.placeholders.phone', 'Enter mobile number')} 
                          />
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
                        <FormLabel>{t('visitors.fields.company')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('visitors.placeholders.company')} />
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
                        <FormLabel>{t('visitors.fields.nationalId')}</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input {...field} placeholder={t('visitors.placeholders.nationalId')} />
                          </FormControl>
                          <VisitorIdScanner onScan={handleIdScan} />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Visit Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">{t('visitors.register.sections.visit')}</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="site_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('visitors.fields.site')} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('visitors.placeholders.site')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sites?.map((site) => (
                              <SelectItem key={site.id} value={site.id}>
                                {site.name}
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
                    name="valid_from"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('visitors.fields.validFrom')} *</FormLabel>
                        <FormControl>
                          <Input {...field} type="datetime-local" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('visitors.fields.duration', 'Visit Duration')} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('visitors.placeholders.duration', 'Select duration')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DURATION_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {t(`visitors.duration.${option.value}`, option.label)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('visitors.fields.notes')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder={t('visitors.placeholders.notes')} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => navigate('/visitors')}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createVisitor.isPending || createVisitRequest.isPending}>
                  <QrCode className="me-2 h-4 w-4" />
                  {createVisitor.isPending ? t('common.loading') : t('visitors.register.submit')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
