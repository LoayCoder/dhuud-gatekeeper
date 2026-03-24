import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useInspectionTemplates } from '@/features/incidents';
import { useCreateSession, useStartSession } from '@/features/incidents';
import { useTemplateItemCount } from '@/hooks/use-template-item-count';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { createSessionSchema, type CreateSessionFormValues } from './CreateSessionSchema';

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSessionDialog({ open, onOpenChange }: CreateSessionDialogProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const direction = i18n.dir();
  const { profile } = useAuth();
  
  const form = useForm<CreateSessionFormValues>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      sessionType: 'asset',
      templateId: '',
      branchId: '',
      siteId: '',
      categoryId: '',
      typeId: '',
      periodDate: new Date(),
    },
  });

  const watchedBranch = form.watch('branchId');
  const watchedCategory = form.watch('categoryId');
  const watchedTemplateId = form.watch('templateId');
  const watchedPeriodDate = form.watch('periodDate');
  
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [sites, setSites] = useState<{ id: string; name: string; branch_id: string | null }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; name_ar: string | null }[]>([]);
  const [types, setTypes] = useState<{ id: string; name: string; name_ar: string | null; category_id: string }[]>([]);
  
  const { data: templates = [] } = useInspectionTemplates();
  const createSession = useCreateSession();
  const startSession = useStartSession();
  
  // Fetch sites and categories
  useEffect(() => {
    if (!profile?.tenant_id) return;
    
    const fetchData = async () => {
      const [branchesRes, sitesRes, categoriesRes, typesRes] = await Promise.all([
        supabase.from('branches').select('id, name').eq('tenant_id', profile.tenant_id).is('deleted_at', null),
        supabase.from('sites').select('id, name, branch_id').eq('tenant_id', profile.tenant_id).is('deleted_at', null),
        supabase.from('asset_categories').select('id, name, name_ar').or(`tenant_id.is.null,tenant_id.eq.${profile.tenant_id}`).is('deleted_at', null),
        supabase.from('asset_types').select('id, name, name_ar, category_id').or(`tenant_id.is.null,tenant_id.eq.${profile.tenant_id}`).is('deleted_at', null),
      ]);
      
      if (branchesRes.data) setBranches(branchesRes.data);
      if (sitesRes.data) setSites(sitesRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (typesRes.data) setTypes(typesRes.data);
    };
    
    fetchData();
  }, [profile?.tenant_id]);
  
  // Auto-populate filters from selected template
  useEffect(() => {
    if (!watchedTemplateId) return;
    
    const selectedTemplate = templates.find(t => t.id === watchedTemplateId);
    if (selectedTemplate) {
      if (selectedTemplate.site_id) {
        form.setValue('siteId', selectedTemplate.site_id);
        const site = sites.find(s => s.id === selectedTemplate.site_id);
        if (site?.branch_id) {
          form.setValue('branchId', site.branch_id);
        }
      }
      if (selectedTemplate.category_id) {
        form.setValue('categoryId', selectedTemplate.category_id);
      }
      if (selectedTemplate.type_id) {
        form.setValue('typeId', selectedTemplate.type_id);
      }
    }
  }, [watchedTemplateId, templates, sites]);
  
  const filteredSites = watchedBranch 
    ? sites.filter(s => s.branch_id === watchedBranch)
    : sites;
  
  const filteredTypes = watchedCategory 
    ? types.filter(t => t.category_id === watchedCategory)
    : types;
  
  const period = format(watchedPeriodDate, 'MMMM yyyy');

  // Cascade handlers
  const handleBranchChange = (value: string) => {
    form.setValue('branchId', value === '__all__' ? '' : value);
    form.setValue('siteId', '');
  };

  const handleCategoryChange = (value: string) => {
    form.setValue('categoryId', value === '__all__' ? '' : value);
    form.setValue('typeId', '');
  };
  
  const onSubmit = async (data: CreateSessionFormValues) => {
    if (!data.templateId) {
      toast({ title: t('common.error'), description: t('inspectionSessions.selectTemplate'), variant: 'destructive' });
      return;
    }
    
    try {
      const session = await createSession.mutateAsync({
        session_type: data.sessionType as 'asset' | 'area' | 'audit',
        template_id: data.templateId,
        period,
        site_id: data.siteId || null,
        category_id: data.categoryId || null,
        type_id: data.typeId || null,
      });
      
      await startSession.mutateAsync(session.id);
      
      toast({ title: t('common.success'), description: t('inspectionSessions.sessionCreated') });
      onOpenChange(false);
      const suffix = data.sessionType === 'area' ? '/area' : data.sessionType === 'audit' ? '/audit' : '';
      navigate(`/inspections/sessions/${session.id}${suffix}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error';
      toast({ title: t('common.error'), description: message, variant: 'destructive' });
    }
  };
  
  const isLoading = createSession.isPending || startSession.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t('inspectionSessions.createSession')}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Session Type */}
            <FormField
              control={form.control}
              name="sessionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspectionSessions.sessionType')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} dir={direction}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="asset">{t('inspectionSessions.bulkAsset')}</SelectItem>
                      <SelectItem value="area">{t('inspectionSessions.areaInspection')}</SelectItem>
                      <SelectItem value="audit">{t('inspectionSessions.hsseAudit')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Template */}
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspectionSessions.selectTemplate')} *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} dir={direction}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('inspectionSessions.selectTemplate')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {i18n.language === 'ar' && template.name_ar ? template.name_ar : template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Period */}
            <FormField
              control={form.control}
              name="periodDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspectionSessions.period')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn("w-full justify-start text-start font-normal", !field.value && "text-muted-foreground")}
                        >
                          <CalendarIcon className="me-2 h-4 w-4" />
                          {period}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => date && field.onChange(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Branch → Site cascade */}
            <div className="space-y-2">
              <Label>{t('inspectionSessions.selectSite')} ({t('common.optional')})</Label>
              <Select value={watchedBranch || "__all__"} onValueChange={handleBranchChange} dir={direction}>
                <SelectTrigger>
                  <SelectValue placeholder={t('inspectionSessions.allSites')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('inspectionSessions.allSites')}</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <FormField
              control={form.control}
              name="siteId"
              render={({ field }) => (
                <FormItem>
                  <Select value={field.value || "__all__"} onValueChange={(v) => field.onChange(v === "__all__" ? "" : v)} dir={direction}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('inspectionSessions.allSites')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__all__">{t('inspectionSessions.allSites')}</SelectItem>
                      {filteredSites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Category → Type cascade */}
            <div className="space-y-2">
              <Label>{t('assets.category')} ({t('common.optional')})</Label>
              <Select value={watchedCategory || "__all__"} onValueChange={handleCategoryChange} dir={direction}>
                <SelectTrigger>
                  <SelectValue placeholder={t('inspectionSessions.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('inspectionSessions.allCategories')}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {i18n.language === 'ar' && cat.name_ar ? cat.name_ar : cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <FormField
              control={form.control}
              name="typeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.type')} ({t('common.optional')})</FormLabel>
                  <Select value={field.value || "__all__"} onValueChange={(v) => field.onChange(v === "__all__" ? "" : v)} dir={direction} disabled={!watchedCategory}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('inspectionSessions.allTypes')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__all__">{t('inspectionSessions.allTypes')}</SelectItem>
                      {filteredTypes.map((type) => (
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
          
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading || !watchedTemplateId}>
                {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t('inspectionSessions.startInspection')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}