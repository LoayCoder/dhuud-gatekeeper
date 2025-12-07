import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { useUpdateSession, type InspectionSession } from '@/hooks/use-inspection-sessions';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const editSessionSchema = z.object({
  period: z.string().min(1, 'Period is required'),
  site_id: z.string().optional(),
  category_id: z.string().optional(),
  type_id: z.string().optional(),
});

type EditSessionFormData = z.infer<typeof editSessionSchema>;

interface EditSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: InspectionSession;
}

export function EditSessionDialog({ open, onOpenChange, session }: EditSessionDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const updateSession = useUpdateSession();
  
  const form = useForm<EditSessionFormData>({
    resolver: zodResolver(editSessionSchema),
    defaultValues: {
      period: session.period || '',
      site_id: session.site_id || '',
      category_id: session.category_id || '',
      type_id: session.type_id || '',
    },
  });

  // Reset form when session changes
  useEffect(() => {
    if (open && session) {
      form.reset({
        period: session.period || '',
        site_id: session.site_id || '',
        category_id: session.category_id || '',
        type_id: session.type_id || '',
      });
    }
  }, [open, session, form]);

  // Fetch sites
  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_categories')
        .select('id, name, name_ar')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch types based on selected category
  const selectedCategoryId = form.watch('category_id');
  const { data: types = [] } = useQuery({
    queryKey: ['asset-types', selectedCategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return [];
      const { data, error } = await supabase
        .from('asset_types')
        .select('id, name, name_ar')
        .eq('category_id', selectedCategoryId)
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCategoryId,
  });

  const isLocked = session.status === 'closed' || session.status === 'completed_with_open_actions';

  const onSubmit = async (data: EditSessionFormData) => {
    try {
      await updateSession.mutateAsync({
        sessionId: session.id,
        updates: {
          period: data.period,
          site_id: data.site_id || null,
          category_id: data.category_id || null,
          type_id: data.type_id || null,
        },
      });
      toast.success(t('inspectionSessions.sessionUpdated'));
      onOpenChange(false);
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t('inspectionSessions.editSession')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspectionSessions.period')}</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder={t('inspectionSessions.periodPlaceholder')}
                      disabled={isLocked}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="site_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspectionSessions.filterBySite')}</FormLabel>
                  <Select 
                    value={field.value || "__all__"} 
                    onValueChange={(val) => field.onChange(val === "__all__" ? "" : val)}
                    dir={direction}
                    disabled={isLocked}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.selectOptional')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__all__">{t('common.all')}</SelectItem>
                      {sites.map((site) => (
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
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspectionSessions.filterByCategory')}</FormLabel>
                  <Select 
                    value={field.value || "__all__"} 
                    onValueChange={(val) => {
                      field.onChange(val === "__all__" ? "" : val);
                      form.setValue('type_id', '');
                    }}
                    dir={direction}
                    disabled={isLocked}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.selectOptional')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__all__">{t('common.all')}</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {i18n.language === 'ar' && cat.name_ar ? cat.name_ar : cat.name}
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
              name="type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspectionSessions.filterByType')}</FormLabel>
                  <Select 
                    value={field.value || "__all__"} 
                    onValueChange={(val) => field.onChange(val === "__all__" ? "" : val)}
                    dir={direction}
                    disabled={isLocked || !selectedCategoryId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('common.selectOptional')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__all__">{t('common.all')}</SelectItem>
                      {types.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {i18n.language === 'ar' && type.name_ar ? type.name_ar : type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isLocked && (
              <p className="text-sm text-muted-foreground">
                {t('inspectionSessions.cannotEditClosedSession')}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLocked || updateSession.isPending}>
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
