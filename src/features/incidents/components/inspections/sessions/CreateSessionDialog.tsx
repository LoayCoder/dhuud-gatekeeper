import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, Loader2, AlertTriangle, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NativeSelect } from '@/components/ui/native-select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useInspectionTemplates } from '@/features/incidents';
import { useCreateSession, useStartSession } from '@/features/incidents';
import { useMatchingAssets } from '@/features/incidents/hooks/use-inspections/use-inspection-template-hooks';
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
      buildingId: '',
      categoryId: '',
      typeId: '',
      subtypeId: '',
      periodDate: new Date(),
    },
  });

  const watchedBranch = form.watch('branchId');
  const watchedSite = form.watch('siteId');
  const watchedCategory = form.watch('categoryId');
  const watchedType = form.watch('typeId');
  const watchedTemplateId = form.watch('templateId');
  const watchedPeriodDate = form.watch('periodDate');
  const watchedSessionType = form.watch('sessionType');
  const watchedBuildingId = form.watch('buildingId');
  const watchedSubtypeId = form.watch('subtypeId');
  
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [sites, setSites] = useState<{ id: string; name: string; branch_id: string | null }[]>([]);
  const [buildings, setBuildings] = useState<{ id: string; name: string; site_id: string | null }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; name_ar: string | null }[]>([]);
  const [types, setTypes] = useState<{ id: string; name: string; name_ar: string | null; category_id: string }[]>([]);
  const [subtypes, setSubtypes] = useState<{ id: string; name: string; name_ar: string | null; type_id: string }[]>([]);
  
  const { data: templates = [] } = useInspectionTemplates(watchedSessionType as 'asset' | 'area' | 'audit');
  const createSession = useCreateSession();
  const startSession = useStartSession();

  // Matching assets count for asset sessions
  const isAssetSession = watchedSessionType === 'asset';
  const { data: matchingData, isLoading: matchingLoading } = useMatchingAssets({
    branchId: watchedBranch || null,
    siteId: form.watch('siteId') || null,
    buildingId: watchedBuildingId || null,
    categoryId: watchedCategory || null,
    typeId: watchedType || null,
    subtypeId: watchedSubtypeId || null,
    enabled: isAssetSession,
  });

  const hasNoMatchingAssets = isAssetSession && !matchingLoading && matchingData?.count === 0;
  
  useEffect(() => {
    if (!profile?.tenant_id) return;
    
    const fetchData = async () => {
      const [branchesRes, sitesRes, buildingsRes, categoriesRes, typesRes, subtypesRes] = await Promise.all([
        supabase.from('branches').select('id, name').eq('tenant_id', profile.tenant_id).is('deleted_at', null),
        supabase.from('sites').select('id, name, branch_id').eq('tenant_id', profile.tenant_id).is('deleted_at', null),
        supabase.from('buildings').select('id, name, site_id').eq('tenant_id', profile.tenant_id).is('deleted_at', null),
        supabase.from('asset_categories').select('id, name, name_ar').or(`tenant_id.is.null,tenant_id.eq.${profile.tenant_id}`).is('deleted_at', null),
        supabase.from('asset_types').select('id, name, name_ar, category_id').or(`tenant_id.is.null,tenant_id.eq.${profile.tenant_id}`).is('deleted_at', null),
        supabase.from('asset_subtypes').select('id, name, name_ar, type_id').or(`tenant_id.is.null,tenant_id.eq.${profile.tenant_id}`).is('deleted_at', null),
      ]);
      
      if (branchesRes.data) setBranches(branchesRes.data);
      if (sitesRes.data) setSites(sitesRes.data);
      if (buildingsRes.data) setBuildings(buildingsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (typesRes.data) setTypes(typesRes.data);
      if (subtypesRes.data) setSubtypes(subtypesRes.data);
    };
    
    fetchData();
  }, [profile?.tenant_id]);
  
  // Prefill from template selection
  useEffect(() => {
    if (!watchedTemplateId) return;
    
    const selectedTemplate = templates.find(t => t.id === watchedTemplateId);
    if (selectedTemplate) {
      if (selectedTemplate.branch_id && branches.some(b => b.id === selectedTemplate.branch_id)) {
        form.setValue('branchId', selectedTemplate.branch_id);
      }
      if (selectedTemplate.site_id) {
        form.setValue('siteId', selectedTemplate.site_id);
      }
      if (selectedTemplate.building_id) {
        form.setValue('buildingId', selectedTemplate.building_id);
      }
      if (selectedTemplate.category_id && categories.some(c => c.id === selectedTemplate.category_id)) {
        form.setValue('categoryId', selectedTemplate.category_id);
      }
      if (selectedTemplate.type_id && types.some(t => t.id === selectedTemplate.type_id)) {
        form.setValue('typeId', selectedTemplate.type_id);
      }
      if (selectedTemplate.subtype_id && subtypes.some(s => s.id === selectedTemplate.subtype_id)) {
        form.setValue('subtypeId', selectedTemplate.subtype_id);
      }
    }
  }, [watchedTemplateId, templates, sites, branches, categories, types, subtypes]);
  
  const filteredSites = watchedBranch 
    ? sites.filter(s => s.branch_id === watchedBranch)
    : sites;

  const filteredBuildings = watchedSite
    ? buildings.filter(b => b.site_id === watchedSite)
    : buildings;
  
  const filteredTypes = watchedCategory 
    ? types.filter(t => t.category_id === watchedCategory)
    : types;

  const filteredSubtypes = watchedType
    ? subtypes.filter(s => s.type_id === watchedType)
    : subtypes;
  
  const period = format(watchedPeriodDate, 'MMMM yyyy');

  const handleBranchChange = (value: string) => {
    form.setValue('branchId', value === '__all__' ? '' : value);
    form.setValue('siteId', '');
    form.setValue('buildingId', '');
  };

  const handleSiteChange = (value: string) => {
    form.setValue('siteId', value === '__all__' ? '' : value);
    form.setValue('buildingId', '');
  };

  const handleCategoryChange = (value: string) => {
    form.setValue('categoryId', value === '__all__' ? '' : value);
    form.setValue('typeId', '');
    form.setValue('subtypeId', '');
  };

  const handleTypeChange = (value: string) => {
    form.setValue('typeId', value === '__all__' ? '' : value);
    form.setValue('subtypeId', '');
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
        branch_id: data.branchId || null,
        site_id: data.siteId || null,
        building_id: data.buildingId || null,
        category_id: data.categoryId || null,
        type_id: data.typeId || null,
        subtype_id: data.subtypeId || null,
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t('inspectionSessions.createSession')}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Session Type — stable options, keep Radix */}
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
            
            {/* Template — stable options, keep Radix */}
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspectionSessions.selectTemplate')} *</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange} dir={direction}>
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
            
            {/* Branch — native select (cascading) */}
            <div className="space-y-2">
              <Label>{t('common.branch', 'Branch')} ({t('common.optional')})</Label>
              <NativeSelect
                value={watchedBranch || '__all__'}
                onChange={handleBranchChange}
                placeholder={t('inspectionSessions.allBranches', 'All Branches')}
                options={branches.map(b => ({ value: b.id, label: b.name }))}
                dir={direction}
              />
            </div>

            {/* Site — native select (cascading) */}
            <div className="space-y-2">
              <Label>{t('inspectionSessions.selectSite')} ({t('common.optional')})</Label>
              <NativeSelect
                value={form.watch('siteId') || '__all__'}
                onChange={(v) => handleSiteChange(v)}
                placeholder={t('inspectionSessions.allSites')}
                options={filteredSites.map(s => ({ value: s.id, label: s.name }))}
                dir={direction}
              />
            </div>

            {/* Building — native select (cascading from site) */}
            <div className="space-y-2">
              <Label>{t('assets.building', 'Building')} ({t('common.optional')})</Label>
              <NativeSelect
                value={watchedBuildingId || '__all__'}
                onChange={(v) => form.setValue('buildingId', v === '__all__' ? '' : v)}
                placeholder={t('inspectionSessions.allBuildings', 'All Buildings')}
                options={filteredBuildings.map(b => ({ value: b.id, label: b.name }))}
                disabled={!watchedSite}
                dir={direction}
              />
            </div>
            
            {/* Category — native select (cascading) */}
            <div className="space-y-2">
              <Label>{t('assets.category')} ({t('common.optional')})</Label>
              <NativeSelect
                value={watchedCategory || '__all__'}
                onChange={handleCategoryChange}
                placeholder={t('inspectionSessions.allCategories')}
                options={categories.map(c => ({ value: c.id, label: i18n.language === 'ar' && c.name_ar ? c.name_ar : c.name }))}
                dir={direction}
              />
            </div>
            
            {/* Type — native select (cascading) */}
            <div className="space-y-2">
              <Label>{t('assets.type')} ({t('common.optional')})</Label>
              <NativeSelect
                value={watchedType || '__all__'}
                onChange={(v) => handleTypeChange(v)}
                placeholder={t('inspectionSessions.allTypes')}
                options={filteredTypes.map(ty => ({ value: ty.id, label: i18n.language === 'ar' && ty.name_ar ? ty.name_ar : ty.name }))}
                disabled={!watchedCategory}
                dir={direction}
              />
            </div>

            {/* Subtype — native select (cascading from type, optional) */}
            <div className="space-y-2">
              <Label>{t('assets.subtype', 'Subtype')} ({t('common.optional')})</Label>
              <NativeSelect
                value={watchedSubtypeId || '__all__'}
                onChange={(v) => form.setValue('subtypeId', v === '__all__' ? '' : v)}
                placeholder={t('inspectionSessions.allSubtypes', 'All Subtypes')}
                options={filteredSubtypes.map(s => ({ value: s.id, label: i18n.language === 'ar' && s.name_ar ? s.name_ar : s.name }))}
                disabled={!watchedType}
                dir={direction}
              />
            </div>

            {/* Matching Assets Count for asset sessions */}
            {isAssetSession && watchedTemplateId && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">
                  {t('inspections.matchingAssets', 'Matching Assets')}:
                </span>
                {matchingLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Badge variant={matchingData?.count ? 'secondary' : 'destructive'} className="text-xs">
                    {matchingData?.count ?? 0}
                  </Badge>
                )}
              </div>
            )}

            {hasNoMatchingAssets && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t('inspections.noMatchingAssets', 'No assets match this template scope. Check the category, type, site, and building filters.')}
              </p>
            )}
          
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading || !watchedTemplateId || !!hasNoMatchingAssets}>
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
