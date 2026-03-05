import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAsset, useAssetCategories, useAssetTypes, useAssetSubtypes, useCreateAsset, useUpdateAsset, useCreateBulkAssets, generateAssetCode, generateSequentialCodes, getNextAssetSequence } from '@/features/assets';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { CreationStatus } from '@/features/assets';
import { assetSchema, AssetFormValues } from '../types';

export function useAssetRegisterState() {
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
  const [bulkQuantity, setBulkQuantity] = useState(1);
  
  // Creation status state for status card
  const [creationStatus, setCreationStatus] = useState<CreationStatus>('idle');
  const [createdAssetIds, setCreatedAssetIds] = useState<string[]>([]);
  const [createdAssetCodes, setCreatedAssetCodes] = useState<string[]>([]);
  const [creationError, setCreationError] = useState<string | null>(null);

  const { data: existingAsset, isLoading: loadingAsset } = useAsset(editId || undefined);
  const { data: categories } = useAssetCategories();
  const { data: types } = useAssetTypes(selectedCategoryId);
  const { data: subtypes } = useAssetSubtypes(selectedTypeId);

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const createBulkAssets = useCreateBulkAssets();

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

  // Auto-generate asset code when category changes - use sequential numbering
  useEffect(() => {
    const generateCode = async () => {
      if (selectedCategoryId && !editId && profile?.tenant_id) {
        const category = categories?.find(c => c.id === selectedCategoryId);
        if (category) {
          try {
            const nextSeq = await getNextAssetSequence(profile.tenant_id, category.code);
            const code = generateAssetCode(category.code, nextSeq);
            form.setValue('asset_code', code);
          } catch (error) {
            console.error('Failed to generate asset code:', error);
            // Fallback to timestamp-based unique code
            const fallbackSeq = Date.now() % 10000;
            const code = generateAssetCode(category.code, fallbackSeq);
            form.setValue('asset_code', code);
          }
        }
      }
    };
    generateCode();
  }, [selectedCategoryId, categories, form, editId, profile?.tenant_id]);

  const onSubmit = async (values: AssetFormValues) => {
    // Reset status and start creation
    setCreationStatus('creating');
    setCreationError(null);
    setCreatedAssetIds([]);
    setCreatedAssetCodes([]);
    
    try {
      const category = categories?.find(c => c.id === values.category_id);
      const type = types?.find(t => t.id === values.type_id);
      
      // ALWAYS refresh the code right before submit to avoid race conditions
      let finalAssetCode = values.asset_code!;
      if (!editId && category && profile?.tenant_id) {
        try {
          console.log('[Submit] Refreshing asset code before submit...');
          const freshSeq = await getNextAssetSequence(profile.tenant_id, category.code);
          finalAssetCode = generateAssetCode(category.code, freshSeq);
          console.log(`[Submit] Refreshed code: ${finalAssetCode} (was: ${values.asset_code})`);
        } catch (err) {
          console.error('[Submit] Failed to refresh code, using existing:', err);
        }
      }
      
      const autoName = `${category?.name || 'Asset'} - ${type?.name || ''} (${finalAssetCode})`.trim();
      
      const assetData = {
        ...values,
        asset_code: finalAssetCode,
        category_id: values.category_id!,
        type_id: values.type_id!,
        name: autoName,
      };
      
      if (editId) {
        await updateAsset.mutateAsync({ id: editId, ...assetData });
        navigate('/assets');
      } else if (bulkQuantity > 1) {
        console.log(`[Submit] Bulk creation: ${bulkQuantity} assets starting from ${finalAssetCode}`);
        const { asset_code, ...baseAssetWithoutCode } = assetData;
        const result = await createBulkAssets.mutateAsync({
          baseAsset: baseAssetWithoutCode,
          quantity: bulkQuantity,
          startCode: asset_code,
        });
        setCreatedAssetIds(result.map(a => a.id));
        setCreatedAssetCodes(result.map(a => a.asset_code));
        setCreationStatus('success');
      } else {
        console.log(`[Submit] Single asset creation: ${finalAssetCode}`);
        const result = await createAsset.mutateAsync(assetData);
        setCreatedAssetIds([result.id]);
        setCreatedAssetCodes([result.asset_code]);
        setCreationStatus('success');
      }
    } catch (error: unknown) {
      console.error('[Submit] Error:', error);
      setCreationError(error?.message || t('assets.unknownError', 'An unknown error occurred'));
      setCreationStatus('error');
    }
  };

  const handleRetry = () => {
    setCreationStatus('idle');
    setCreationError(null);
  };

  const handleCreateAnother = () => {
    setCreationStatus('idle');
    setCreationError(null);
    setCreatedAssetIds([]);
    setCreatedAssetCodes([]);
    form.reset({
      status: 'active',
      criticality_level: 'medium',
      ownership: 'company',
      tags: [],
      category_id: '',
      type_id: '',
      asset_code: '',
    });
    setSelectedCategoryId(null);
    setSelectedTypeId(null);
    setBulkQuantity(1);
    setActiveTab('classification');
  };

  const isSubmitting = createAsset.isPending || updateAsset.isPending || createBulkAssets.isPending;

  const filteredSites = selectedBranchId 
    ? sites?.filter(s => s.branch_id === selectedBranchId) 
    : sites;

  const previewCodes = bulkQuantity > 1 && form.watch('asset_code')
    ? generateSequentialCodes(form.watch('asset_code') as string, Math.min(bulkQuantity, 5))
    : [];

  return {
    t, i18n, navigate, searchParams, editId, direction, isArabic,
    profile, tenantId, activeTab, setActiveTab,
    selectedCategoryId, setSelectedCategoryId,
    selectedTypeId, setSelectedTypeId,
    selectedBranchId, setSelectedBranchId,
    selectedSiteId, setSelectedSiteId,
    selectedBuildingId, setSelectedBuildingId,
    bulkQuantity, setBulkQuantity,
    creationStatus, setCreationStatus,
    createdAssetIds, setCreatedAssetIds,
    createdAssetCodes, setCreatedAssetCodes,
    creationError, setCreationError,
    existingAsset, loadingAsset,
    categories, types, subtypes,
    createAsset, updateAsset, createBulkAssets,
    branches, sites, buildings, floorsZones,
    form, onSubmit, handleRetry, handleCreateAnother,
    isSubmitting, filteredSites, previewCodes, generateSequentialCodes
  };
}

