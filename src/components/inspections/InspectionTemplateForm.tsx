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
  FormDescription,
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
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { InspectionTemplate } from '@/hooks/use-inspections';
import { useInspectionTemplateCategories, AREA_TYPES, TEMPLATE_TYPES } from '@/hooks/use-inspection-categories';
import i18n from '@/i18n';
import { ClipboardList, MapPin, Briefcase } from 'lucide-react';

const templateSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  name_ar: z.string().optional(),
  description: z.string().optional(),
  template_type: z.enum(['asset', 'area', 'audit']).default('asset'),
  inspection_category_id: z.string().optional(),
  area_type: z.string().optional(),
  standard_reference: z.string().optional(),
  passing_score_percentage: z.number().min(0).max(100).optional(),
  estimated_duration_minutes: z.number().min(0).optional(),
  requires_photos: z.boolean().default(false),
  requires_gps: z.boolean().default(false),
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

const templateTypeIcons = {
  asset: ClipboardList,
  area: MapPin,
  audit: Briefcase,
};

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
      template_type: 'asset',
      inspection_category_id: undefined,
      area_type: undefined,
      standard_reference: '',
      passing_score_percentage: 80,
      estimated_duration_minutes: undefined,
      requires_photos: false,
      requires_gps: false,
      category_id: undefined,
      type_id: undefined,
      branch_id: undefined,
      site_id: undefined,
      is_active: true,
    },
  });

  const templateType = form.watch('template_type');

  // Fetch tenant's template code prefix
  const { data: tenantData } = useQuery({
    queryKey: ['tenant-prefix', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('template_code_prefix')
        .eq('id', profile!.tenant_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id && !template && open,
  });

  const tenantPrefix = tenantData?.template_code_prefix;

  // Fetch the next available code for the selected template type
  const { data: nextCodeNumber } = useQuery({
    queryKey: ['next-template-code', templateType, profile?.tenant_id, tenantPrefix],
    queryFn: async () => {
      const typePrefix = templateType.toUpperCase();
      const fullPrefix = tenantPrefix ? `${tenantPrefix}-${typePrefix}` : typePrefix;
      
      const { data, error } = await supabase
        .from('inspection_templates')
        .select('code')
        .eq('tenant_id', profile!.tenant_id)
        .eq('template_type', templateType)
        .is('deleted_at', null)
        .ilike('code', `${fullPrefix}-%`)
        .order('code', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const lastCode = data[0].code;
        const pattern = tenantPrefix 
          ? `^${tenantPrefix}-${typePrefix}-(\\d+)$`
          : `^${typePrefix}-(\\d+)$`;
        const match = lastCode.match(new RegExp(pattern));
        if (match) {
          return parseInt(match[1], 10) + 1;
        }
      }
      return 1;
    },
    enabled: !!profile?.tenant_id && !template && open,
  });

  // Auto-generate template code when template type changes (only for new templates)
  useEffect(() => {
    if (!template && open && nextCodeNumber !== undefined) {
      const typePrefix = templateType.toUpperCase();
      const fullPrefix = tenantPrefix ? `${tenantPrefix}-${typePrefix}` : typePrefix;
      const paddedNumber = String(nextCodeNumber).padStart(3, '0');
      const generatedCode = `${fullPrefix}-${paddedNumber}`;
      form.setValue('code', generatedCode);
    }
  }, [templateType, nextCodeNumber, tenantPrefix, template, open, form]);

  // Reset form when dialog opens with template data
  useEffect(() => {
    if (open) {
      form.reset({
        code: template?.code || '',
        name: template?.name || '',
        name_ar: template?.name_ar || '',
        description: template?.description || '',
        template_type: (template?.template_type as 'asset' | 'area' | 'audit') || 'asset',
        inspection_category_id: (template as any)?.inspection_category_id || undefined,
        area_type: (template as any)?.area_type || undefined,
        standard_reference: (template as any)?.standard_reference || '',
        passing_score_percentage: (template as any)?.passing_score_percentage || 80,
        estimated_duration_minutes: (template as any)?.estimated_duration_minutes || undefined,
        requires_photos: (template as any)?.requires_photos || false,
        requires_gps: (template as any)?.requires_gps || false,
        category_id: template?.category_id || undefined,
        type_id: template?.type_id || undefined,
        branch_id: template?.branch_id || undefined,
        site_id: template?.site_id || undefined,
        is_active: template?.is_active ?? true,
      });
    }
  }, [open, template, form]);
  
  // Fetch inspection template categories
  const { data: inspectionCategories } = useInspectionTemplateCategories();
  
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
  
  // Fetch asset categories (for asset type templates)
  const { data: assetCategories } = useQuery({
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
    enabled: templateType === 'asset',
  });
  
  const selectedCategoryId = form.watch('category_id');
  
  const { data: assetTypes } = useQuery({
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
    enabled: !!selectedCategoryId && templateType === 'asset',
  });
  
  // Check if template code already exists for the tenant
  const checkDuplicateCode = async (code: string): Promise<boolean> => {
    if (!profile?.tenant_id) return false;
    
    let query = supabase
      .from('inspection_templates')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('code', code)
      .is('deleted_at', null);
    
    // Exclude current template when editing
    if (template?.id) {
      query = query.neq('id', template.id);
    }
    
    const { data } = await query.limit(1);
    return (data?.length ?? 0) > 0;
  };

  const handleSubmit = async (data: TemplateFormData) => {
    // Check for duplicate code before submission
    const isDuplicate = await checkDuplicateCode(data.code);
    if (isDuplicate) {
      form.setError('code', {
        type: 'manual',
        message: t('inspections.form.codeDuplicate', 'This template code already exists'),
      });
      return;
    }

    await onSubmit({
      ...data,
      inspection_category_id: data.inspection_category_id || undefined,
      area_type: templateType === 'area' ? data.area_type : undefined,
      category_id: templateType === 'asset' ? data.category_id : undefined,
      type_id: templateType === 'asset' ? data.type_id : undefined,
      branch_id: data.branch_id || undefined,
      site_id: data.site_id || undefined,
    });
    form.reset();
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={direction}>
        <DialogHeader>
          <DialogTitle>
            {template ? t('inspections.editTemplate') : t('inspections.createTemplate')}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Template Type Selection */}
            <FormField
              control={form.control}
              name="template_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inspections.form.templateType')}</FormLabel>
                  <div className="flex gap-2">
                    {TEMPLATE_TYPES.map((type) => {
                      const Icon = templateTypeIcons[type.value];
                      const isSelected = field.value === type.value;
                      return (
                        <Button
                          key={type.value}
                          type="button"
                          variant={isSelected ? 'default' : 'outline'}
                          className="flex-1 flex items-center gap-2"
                          onClick={() => field.onChange(type.value)}
                          disabled={!!template}
                        >
                          <Icon className="h-4 w-4" />
                          {t(type.labelKey)}
                        </Button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />
            
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">{t('common.basicInfo')}</h4>
              
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inspections.code')}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="ASSET-001" 
                        disabled={!!template}
                        readOnly={!template}
                        className={!template ? "bg-muted" : ""}
                      />
                    </FormControl>
                    <FormDescription>
                      {!template && t('inspections.form.codeAutoGenerated', 'Auto-generated based on template type')}
                    </FormDescription>
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
            </div>

            <Separator />
            
            {/* Category & Classification */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">{t('inspections.form.classification')}</h4>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Inspection Category */}
                <FormField
                  control={form.control}
                  name="inspection_category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('inspections.form.inspectionCategory')}</FormLabel>
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
                          {inspectionCategories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className="text-xs"
                                  style={{ borderColor: cat.color || undefined }}
                                >
                                  {direction === 'rtl' ? cat.name_ar || cat.name : cat.name}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Area Type - only for area template type */}
                {templateType === 'area' && (
                  <FormField
                    control={form.control}
                    name="area_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('inspections.form.areaType')}</FormLabel>
                        <Select
                          value={field.value || ''}
                          onValueChange={(val) => field.onChange(val || undefined)}
                          dir={direction}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('common.select')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AREA_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {t(type.labelKey)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Asset Category & Type - only for asset template type */}
                {templateType === 'asset' && (
                  <>
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
                              {assetCategories?.map((cat) => (
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
                              {assetTypes?.map((type) => (
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
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Compliance Settings */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">{t('inspections.form.complianceSettings')}</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="standard_reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('inspections.form.standardReference')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="OSHA 29 CFR 1910.106" />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {t('inspections.form.standardReferenceHint')}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passing_score_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('inspections.form.passingScore')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0} 
                          max={100}
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 80)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimated_duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('inspections.form.estimatedDuration')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0}
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          placeholder="60"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />
            
            {/* Location Assignment */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">{t('inspections.form.locationAssignment')}</h4>
              
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
            </div>

            <Separator />

            {/* Requirements */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">{t('inspections.form.requirements')}</h4>
              
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="requires_photos"
                  render={({ field }) => (
                    <FormItem className="flex flex-1 items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="cursor-pointer">{t('inspections.form.requiresPhotos')}</FormLabel>
                        <FormDescription className="text-xs">
                          {t('inspections.form.requiresPhotosHint')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requires_gps"
                  render={({ field }) => (
                    <FormItem className="flex flex-1 items-center justify-between rounded-lg border p-3">
                      <div>
                        <FormLabel className="cursor-pointer">{t('inspections.form.requiresGPS')}</FormLabel>
                        <FormDescription className="text-xs">
                          {t('inspections.form.requiresGPSHint')}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />
            
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
