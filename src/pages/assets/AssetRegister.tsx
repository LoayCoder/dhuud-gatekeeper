import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Package, MapPin, Settings, Calendar, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleGate } from '@/components/ModuleGate';
import { HSSERoute } from '@/components/HSSERoute';
import { useAsset, useAssetCategories, useAssetTypes, useAssetSubtypes, useCreateAsset, useUpdateAsset, generateAssetCode } from '@/hooks/use-assets';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const assetSchema = z.object({
  // Classification
  category_id: z.string().min(1, 'Category is required'),
  type_id: z.string().min(1, 'Type is required'),
  subtype_id: z.string().optional().nullable(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  asset_code: z.string().min(1, 'Asset code is required'),
  
  // Identification
  serial_number: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  qr_code_data: z.string().optional(),
  tags: z.array(z.string()).optional(),
  
  // Location
  branch_id: z.string().optional().nullable(),
  site_id: z.string().optional().nullable(),
  building_id: z.string().optional().nullable(),
  floor_zone_id: z.string().optional().nullable(),
  location_details: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  
  // Status
  status: z.enum(['active', 'inactive', 'under_maintenance', 'out_of_service', 'disposed']).default('active'),
  condition_rating: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']).optional().nullable(),
  criticality_level: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  ownership: z.enum(['company', 'leased', 'rented', 'contractor']).default('company'),
  
  // Lifecycle
  installation_date: z.string().optional().nullable(),
  commissioning_date: z.string().optional().nullable(),
  warranty_expiry_date: z.string().optional().nullable(),
  expected_lifespan_years: z.number().optional().nullable(),
  
  // Maintenance
  inspection_interval_days: z.number().optional().nullable(),
  maintenance_vendor: z.string().optional(),
  maintenance_contract_id: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

function AssetRegisterContent() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const direction = i18n.dir();
  const isArabic = i18n.language === 'ar';

  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const [activeTab, setActiveTab] = useState('classification');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  const { data: existingAsset, isLoading: loadingAsset } = useAsset(editId || undefined);
  const { data: categories } = useAssetCategories();
  const { data: types } = useAssetTypes(selectedCategoryId);
  const { data: subtypes } = useAssetSubtypes(selectedTypeId);

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();

  // Fetch location data
  const { data: branches } = useQuery({
    queryKey: ['branches', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('branches')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: sites } = useQuery({
    queryKey: ['sites', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data } = await supabase
        .from('sites')
        .select('id, name, branch_id')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: buildings } = useQuery({
    queryKey: ['buildings', selectedSiteId],
    queryFn: async () => {
      if (!selectedSiteId) return [];
      const { data } = await supabase
        .from('buildings')
        .select('id, name, name_ar')
        .eq('site_id', selectedSiteId)
        .is('deleted_at', null)
        .order('name');
      return data || [];
    },
    enabled: !!selectedSiteId,
  });

  const { data: floorsZones } = useQuery({
    queryKey: ['floors-zones', selectedBuildingId],
    queryFn: async () => {
      if (!selectedBuildingId) return [];
      const { data } = await supabase
        .from('floors_zones')
        .select('id, name, name_ar')
        .eq('building_id', selectedBuildingId)
        .is('deleted_at', null)
        .order('level_number');
      return data || [];
    },
    enabled: !!selectedBuildingId,
  });

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      status: 'active',
      criticality_level: 'medium',
      ownership: 'company',
      tags: [],
    },
  });

  // Pre-populate form when editing
  useEffect(() => {
    if (existingAsset) {
      setSelectedCategoryId(existingAsset.category_id);
      setSelectedTypeId(existingAsset.type_id);
      setSelectedBranchId(existingAsset.branch_id);
      setSelectedSiteId(existingAsset.site_id);
      setSelectedBuildingId(existingAsset.building_id);

      form.reset({
        category_id: existingAsset.category_id,
        type_id: existingAsset.type_id,
        subtype_id: existingAsset.subtype_id,
        name: existingAsset.name,
        description: existingAsset.description || '',
        asset_code: existingAsset.asset_code,
        serial_number: existingAsset.serial_number || '',
        manufacturer: existingAsset.manufacturer || '',
        model: existingAsset.model || '',
        qr_code_data: existingAsset.qr_code_data || '',
        tags: existingAsset.tags || [],
        branch_id: existingAsset.branch_id,
        site_id: existingAsset.site_id,
        building_id: existingAsset.building_id,
        floor_zone_id: existingAsset.floor_zone_id,
        location_details: existingAsset.location_details || '',
        latitude: existingAsset.latitude,
        longitude: existingAsset.longitude,
        status: existingAsset.status || 'active',
        condition_rating: existingAsset.condition_rating,
        criticality_level: existingAsset.criticality_level || 'medium',
        ownership: existingAsset.ownership || 'company',
        installation_date: existingAsset.installation_date,
        commissioning_date: existingAsset.commissioning_date,
        warranty_expiry_date: existingAsset.warranty_expiry_date,
        expected_lifespan_years: existingAsset.expected_lifespan_years,
        inspection_interval_days: existingAsset.inspection_interval_days,
        maintenance_vendor: existingAsset.maintenance_vendor || '',
        maintenance_contract_id: existingAsset.maintenance_contract_id || '',
      });
    }
  }, [existingAsset, form]);

  // Auto-generate asset code when category changes
  useEffect(() => {
    if (selectedCategoryId && !editId) {
      const category = categories?.find(c => c.id === selectedCategoryId);
      if (category) {
        const code = generateAssetCode(category.code, Math.floor(Math.random() * 9999) + 1);
        form.setValue('asset_code', code);
      }
    }
  }, [selectedCategoryId, categories, form, editId]);

  const onSubmit = async (values: AssetFormValues) => {
    try {
      if (editId) {
        await updateAsset.mutateAsync({ id: editId, ...values });
      } else {
        await createAsset.mutateAsync(values);
      }
      navigate('/assets');
    } catch (error) {
      // Error handled in mutation
    }
  };

  const isSubmitting = createAsset.isPending || updateAsset.isPending;

  const filteredSites = selectedBranchId 
    ? sites?.filter(s => s.branch_id === selectedBranchId) 
    : sites;

  if (loadingAsset && editId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/assets')}>
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {editId ? t('assets.editAsset') : t('assets.registerAsset')}
          </h1>
          <p className="text-muted-foreground">{t('assets.registerDescription')}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} dir={direction}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="classification" className="gap-2">
                <Package className="h-4 w-4 hidden sm:block" />
                {t('assets.steps.classification')}
              </TabsTrigger>
              <TabsTrigger value="location" className="gap-2">
                <MapPin className="h-4 w-4 hidden sm:block" />
                {t('assets.steps.location')}
              </TabsTrigger>
              <TabsTrigger value="status" className="gap-2">
                <Settings className="h-4 w-4 hidden sm:block" />
                {t('assets.steps.status')}
              </TabsTrigger>
              <TabsTrigger value="lifecycle" className="gap-2">
                <Calendar className="h-4 w-4 hidden sm:block" />
                {t('assets.steps.lifecycle')}
              </TabsTrigger>
            </TabsList>

            {/* Classification Tab */}
            <TabsContent value="classification">
              <Card>
                <CardHeader>
                  <CardTitle>{t('assets.classificationTitle')}</CardTitle>
                  <CardDescription>{t('assets.classificationDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="category_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('assets.category')} *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(v) => {
                              field.onChange(v);
                              setSelectedCategoryId(v);
                              setSelectedTypeId(null);
                              form.setValue('type_id', '');
                              form.setValue('subtype_id', null);
                            }}
                            dir={direction}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('assets.selectCategory')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories?.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {isArabic && cat.name_ar ? cat.name_ar : cat.name}
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
                          <FormLabel>{t('assets.type')} *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={(v) => {
                              field.onChange(v);
                              setSelectedTypeId(v);
                              form.setValue('subtype_id', null);
                            }}
                            disabled={!selectedCategoryId}
                            dir={direction}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('assets.selectType')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {types?.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  {isArabic && type.name_ar ? type.name_ar : type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {subtypes && subtypes.length > 0 && (
                      <FormField
                        control={form.control}
                        name="subtype_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('assets.subtype')}</FormLabel>
                            <Select
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              dir={direction}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('assets.selectSubtype')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {subtypes.map((sub) => (
                                  <SelectItem key={sub.id} value={sub.id}>
                                    {isArabic && sub.name_ar ? sub.name_ar : sub.name}
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
                      name="asset_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('assets.assetCode')} *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="FE-2025-0001" className="font-mono" />
                          </FormControl>
                          <FormDescription>{t('assets.assetCodeHint')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('assets.name')} *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('assets.namePlaceholder')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('assets.descriptionLabel')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder={t('assets.descriptionPlaceholder')} rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-6 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="serial_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('assets.serialNumber')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="manufacturer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('assets.manufacturer')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('assets.model')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location">
              <Card>
                <CardHeader>
                  <CardTitle>{t('assets.locationTitle')}</CardTitle>
                  <CardDescription>{t('assets.locationDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="branch_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('orgStructure.branch')}</FormLabel>
                          <Select
                            value={field.value || ''}
                            onValueChange={(v) => {
                              field.onChange(v || null);
                              setSelectedBranchId(v || null);
                              form.setValue('site_id', null);
                              setSelectedSiteId(null);
                            }}
                            dir={direction}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('assets.selectBranch')} />
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
                          <FormLabel>{t('orgStructure.site')}</FormLabel>
                          <Select
                            value={field.value || ''}
                            onValueChange={(v) => {
                              field.onChange(v || null);
                              setSelectedSiteId(v || null);
                              form.setValue('building_id', null);
                              setSelectedBuildingId(null);
                            }}
                            dir={direction}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('assets.selectSite')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredSites?.map((site) => (
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
                      name="building_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('assets.building')}</FormLabel>
                          <Select
                            value={field.value || ''}
                            onValueChange={(v) => {
                              field.onChange(v || null);
                              setSelectedBuildingId(v || null);
                              form.setValue('floor_zone_id', null);
                            }}
                            disabled={!selectedSiteId}
                            dir={direction}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('assets.selectBuilding')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {buildings?.map((bldg) => (
                                <SelectItem key={bldg.id} value={bldg.id}>
                                  {isArabic && bldg.name_ar ? bldg.name_ar : bldg.name}
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
                      name="floor_zone_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('assets.floorZone')}</FormLabel>
                          <Select
                            value={field.value || ''}
                            onValueChange={(v) => field.onChange(v || null)}
                            disabled={!selectedBuildingId}
                            dir={direction}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('assets.selectFloorZone')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {floorsZones?.map((fz) => (
                                <SelectItem key={fz.id} value={fz.id}>
                                  {isArabic && fz.name_ar ? fz.name_ar : fz.name}
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
                    name="location_details"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('assets.locationDetails')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder={t('assets.locationDetailsPlaceholder')} rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Status Tab */}
            <TabsContent value="status">
              <Card>
                <CardHeader>
                  <CardTitle>{t('assets.statusTitle')}</CardTitle>
                  <CardDescription>{t('assets.statusDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('assets.status.label')}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange} dir={direction}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">{t('assets.status.active')}</SelectItem>
                              <SelectItem value="inactive">{t('assets.status.inactive')}</SelectItem>
                              <SelectItem value="under_maintenance">{t('assets.status.under_maintenance')}</SelectItem>
                              <SelectItem value="out_of_service">{t('assets.status.out_of_service')}</SelectItem>
                              <SelectItem value="disposed">{t('assets.status.disposed')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="condition_rating"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('assets.condition')}</FormLabel>
                          <Select value={field.value || ''} onValueChange={(v) => field.onChange(v || null)} dir={direction}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('assets.selectCondition')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="excellent">{t('assets.conditions.excellent')}</SelectItem>
                              <SelectItem value="good">{t('assets.conditions.good')}</SelectItem>
                              <SelectItem value="fair">{t('assets.conditions.fair')}</SelectItem>
                              <SelectItem value="poor">{t('assets.conditions.poor')}</SelectItem>
                              <SelectItem value="critical">{t('assets.conditions.critical')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="criticality_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('assets.criticality')}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange} dir={direction}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">{t('assets.criticality.low')}</SelectItem>
                              <SelectItem value="medium">{t('assets.criticality.medium')}</SelectItem>
                              <SelectItem value="high">{t('assets.criticality.high')}</SelectItem>
                              <SelectItem value="critical">{t('assets.criticality.critical')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ownership"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('assets.ownershipLabel')}</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange} dir={direction}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="company">{t('assets.ownership.company')}</SelectItem>
                              <SelectItem value="leased">{t('assets.ownership.leased')}</SelectItem>
                              <SelectItem value="rented">{t('assets.ownership.rented')}</SelectItem>
                              <SelectItem value="contractor">{t('assets.ownership.contractor')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Lifecycle Tab */}
            <TabsContent value="lifecycle">
              <Card>
                <CardHeader>
                  <CardTitle>{t('assets.lifecycleTitle')}</CardTitle>
                  <CardDescription>{t('assets.lifecycleDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="installation_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('assets.installationDate')}</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value || ''} 
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="commissioning_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('assets.commissioningDate')}</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value || ''} 
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="warranty_expiry_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('assets.warrantyExpiry')}</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value || ''} 
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="expected_lifespan_years"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('assets.expectedLifespan')}</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value || ''} 
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormDescription>{t('assets.yearsUnit')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="inspection_interval_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('assets.inspectionInterval')}</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value || ''} 
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormDescription>{t('assets.daysUnit')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maintenance_vendor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('assets.maintenanceVendor')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 mt-6">
            <Button type="button" variant="outline" onClick={() => navigate('/assets')}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editId ? t('common.saveChanges') : t('assets.registerAsset')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function AssetRegister() {
  return (
    <ModuleGate module="asset_management">
      <HSSERoute>
        <AssetRegisterContent />
      </HSSERoute>
    </ModuleGate>
  );
}
