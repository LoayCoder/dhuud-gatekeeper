import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface Module {
  id: string;
  code: string;
  name: string;
  description: string | null;
  base_price_monthly: number;
  base_price_yearly?: number;
  is_active: boolean;
  sort_order: number;
  icon: string | null;
}

export interface Plan {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  base_price_monthly: number;
  price_yearly: number | null;
  price_per_user: number;
  price_per_user_yearly: number;
  included_users: number;
  max_users: number;
  is_active: boolean;
  is_custom: boolean;
}

export interface PriceBreakdown {
  basePrice: number;
  includedUsers: number;
  extraUsers: number;
  pricePerUser: number;
  userPrice: number;
  modulePrice: number;
  total: number;
  totalMonthly: number;
  billingPeriod: BillingPeriod;
  billingMonths: number;
  moduleDetails: { id: string; name: string; price: number; included: boolean }[];
}

export type BillingPeriod = 'monthly' | 'yearly' | 'custom';

export interface UsePriceCalculatorReturn {
  plans: Plan[];
  modules: Module[];
  isLoading: boolean;
  error: Error | null;
  
  selectedPlanId: string | null;
  selectedUserCount: number;
  selectedModuleIds: string[];
  billingPeriod: BillingPeriod;
  billingMonths: number;
  
  setSelectedPlanId: (id: string | null) => void;
  setSelectedUserCount: (count: number) => void;
  setSelectedModuleIds: (ids: string[]) => void;
  setBillingMonths: (months: number) => void;
  setBillingPeriod: (period: BillingPeriod) => void;
  toggleModule: (id: string) => void;
  
  priceBreakdown: PriceBreakdown | null;
  isCalculating: boolean;
}

export function usePriceCalculator(
  initialPlanId?: string,
  initialUserCount = 5,
  initialModuleIds: string[] = [],
  initialBillingPeriod: BillingPeriod = 'monthly'
): UsePriceCalculatorReturn {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(initialPlanId || null);
  const [selectedUserCount, setSelectedUserCount] = useState(initialUserCount);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>(initialModuleIds);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(initialBillingPeriod);
  const [billingMonths, setBillingMonths] = useState(initialBillingPeriod === 'yearly' ? 12 : 1);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Sync billingPeriod with billingMonths
  const handleSetBillingMonths = useCallback((months: number) => {
    setBillingMonths(months);
    if (months === 12) {
      setBillingPeriod('yearly');
    } else if (months === 1) {
      setBillingPeriod('monthly');
    } else {
      setBillingPeriod('custom');
    }
  }, []);

  const { data: plans = [], isLoading: plansLoading, error: plansError } = useQuery({
    queryKey: ['plans-dynamic'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name, display_name, description, base_price_monthly, price_yearly, price_per_user, price_per_user_yearly, included_users, max_users, is_active, is_custom')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return (data || []) as Plan[];
    },
  });

  const { data: modules = [], isLoading: modulesLoading, error: modulesError } = useQuery({
    queryKey: ['modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return (data || []) as Module[];
    },
  });

  const calculatePrice = useCallback(async () => {
    if (!selectedPlanId || selectedUserCount < 1) {
      setPriceBreakdown(null);
      return;
    }

    setIsCalculating(true);
    try {
      // For custom months, use monthly pricing from DB, then multiply on frontend
      const dbBillingPeriod = billingMonths === 12 ? 'yearly' : 'monthly';
      
      const { data, error } = await supabase.rpc('calculate_subscription_price', {
        p_plan_id: selectedPlanId,
        p_user_count: selectedUserCount,
        p_module_ids: selectedModuleIds,
        p_billing_period: dbBillingPeriod,
      });

      if (error) throw error;

      const priceData = data as {
        base_price: number;
        included_users: number;
        extra_users: number;
        price_per_user: number;
        user_price: number;
        module_price: number;
        total: number;
        total_monthly: number;
        billing_period: string;
      };

      const moduleDetails = selectedModuleIds.map(moduleId => {
        const mod = modules.find(m => m.id === moduleId);
        const monthlyPrice = mod?.base_price_monthly || 0;
        return {
          id: moduleId,
          name: mod?.name || 'Unknown',
          price: monthlyPrice * billingMonths,
          included: false,
        };
      });

      // Calculate total based on billing months
      const monthlyTotal = priceData.total_monthly || 0;
      const periodTotal = billingMonths === 12 
        ? (priceData.total || monthlyTotal * 12)
        : monthlyTotal * billingMonths;

      setPriceBreakdown({
        basePrice: (priceData.base_price || 0) * (billingMonths === 12 ? 1 : billingMonths),
        includedUsers: priceData.included_users || 1,
        extraUsers: priceData.extra_users || 0,
        pricePerUser: priceData.price_per_user || 0,
        userPrice: (priceData.user_price || 0) * (billingMonths === 12 ? 1 : billingMonths),
        modulePrice: (priceData.module_price || 0) * (billingMonths === 12 ? 1 : billingMonths),
        total: periodTotal,
        totalMonthly: priceData.total_monthly || 0,
        billingPeriod: billingPeriod,
        billingMonths: billingMonths,
        moduleDetails,
      });
    } catch (err) {
      console.error('Price calculation error:', err);
      setPriceBreakdown(null);
    } finally {
      setIsCalculating(false);
    }
  }, [selectedPlanId, selectedUserCount, selectedModuleIds, billingPeriod, modules]);

  useEffect(() => {
    const timer = setTimeout(() => {
      calculatePrice();
    }, 300);
    return () => clearTimeout(timer);
  }, [calculatePrice]);

  const toggleModule = useCallback((moduleId: string) => {
    setSelectedModuleIds(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  }, []);

  return {
    plans,
    modules,
    isLoading: plansLoading || modulesLoading,
    error: plansError || modulesError,
    selectedPlanId,
    selectedUserCount,
    selectedModuleIds,
    billingPeriod,
    billingMonths,
    setSelectedPlanId,
    setSelectedUserCount,
    setSelectedModuleIds,
    setBillingPeriod,
    setBillingMonths: handleSetBillingMonths,
    toggleModule,
    priceBreakdown,
    isCalculating,
  };
}

export function formatPrice(cents: number, currency = 'SAR'): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
