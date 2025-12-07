import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InspectionTemplate } from '@/hooks/use-inspections';
import i18n from '@/i18n';

const templateSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  name_ar: z.string().optional(),
  description: z.string().optional(),
  category_id: z.string().optional(),
  type_id: z.string().optional(),
  branch_id: z.string().optional(),
  site_id: z.string().optional(),
  is_active: z.boolean().default(true),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface InspectionTemplateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: InspectionTemplate | null;
  onSubmit: (data: TemplateFormData) => Promise<void>;
  isLoading?: boolean;
}

export function InspectionTemplateForm({
  open,
  onOpenChange,
  template,
  onSubmit,
  isLoading,
}: InspectionTemplateFormProps) {
  const { t } = useTranslation();
  const direction = i18n.dir();
  const { profile } = useAuth();
  
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      code: '',
      name: '',
      name_ar: '',
      description: '',
      category_id: undefined,
      type_id: undefined,
      branch_id: undefined,
      site_id: undefined,
      is_active: true,
    },
  });

  // Reset form when dialog opens with template data
  useEffect(() => {
    if (open) {
      form.reset({
        code: template?.code || '',
        name: template?.name || '',
        name_ar: template?.name_ar || '',
        description: template?.description || '',
        category_id: template?.category_id || undefined,
        type_id: template?.type_id || undefined,
        branch_id: template?.branch_id || undefined,
        site_id: template?.site_id || undefined,
        is_active: template?.is_active ?? true,
      });
    }
  }, [open, template, form]);
  
  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['branches', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('tenant_id', profile!.tenant_id)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });
  
  const selectedBranchId = form.watch('branch_id');
  
  // Fetch sites based on selected branch
  const { data: sites } = useQuery({
    queryKey: ['sites', profile?.tenant_id, selectedBranchId],
    queryFn: async () => {
      let query = supabase
        .from('sites')
        .select('id, name')
        .eq('tenant_id', profile!.tenant_id)
        .is('deleted_at', null)
        .order('name');
      
      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });
  
  const { data: categories } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_categories')
        .select('id, name, name_ar')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
  
  const selectedCategoryId = form.watch('category_id');
  
  const { data: types } = useQuery({
    queryKey: ['asset-types', selectedCategoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_types')
        .select('id, name, name_ar')
        .eq('category_id', selectedCategoryId!)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCategoryId,
  });
  
  const handleSubmit = async (data: TemplateFormData) => {
    await onSubmit({
      ...data,
      category_id: data.category_id || undefined,
      type_id: data.type_id || undefined,
      branch_id: data.branch_id || undefined,
      site_id: data.site_id || undefined,
    });
    form.reset();
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <DialogTitle>
            {template ? t('inspections.editTemplate') : t('inspections.createTemplate')}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspections.code')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="FIRE-EXT-01" disabled={!!template} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inspections.templateName')} (EN)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inspections.templateName')} (AR)</FormLabel>
                    <FormControl>
                      <Input {...field} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspections.templateDescription')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Branch and Site Assignment */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="branch_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inspections.linkedBranch')}</FormLabel>
                    <Select
                      value={field.value || ''}
                      onValueChange={(val) => {
                        field.onChange(val || undefined);
                        form.setValue('site_id', undefined);
                      }}
                      dir={direction}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.selectOptional')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {branches?.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
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
                name="site_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inspections.linkedSite')}</FormLabel>
                    <Select
                      value={field.value || ''}
                      onValueChange={(val) => field.onChange(val || undefined)}
                      dir={direction}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.selectOptional')} />
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
            </div>
            
            {/* Category and Type */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inspections.linkedCategory')}</FormLabel>
                    <Select
                      value={field.value || ''}
                      onValueChange={(val) => {
                        field.onChange(val || undefined);
                        form.setValue('type_id', undefined);
                      }}
                      dir={direction}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.selectOptional')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {direction === 'rtl' ? cat.name_ar || cat.name : cat.name}
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
                    <FormLabel>{t('inspections.linkedType')}</FormLabel>
                    <Select
                      value={field.value || ''}
                      onValueChange={(val) => field.onChange(val || undefined)}
                      disabled={!selectedCategoryId}
                      dir={direction}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('common.selectOptional')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {types?.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {direction === 'rtl' ? type.name_ar || type.name : type.name}
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
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="cursor-pointer">{t('common.active')}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t('common.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}