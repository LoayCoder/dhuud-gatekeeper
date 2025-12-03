import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface Module {
  id: string;
  code: string;
  name: string;
  description: string | null;
  base_price_monthly: number;
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
  price_per_user: number;
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
  totalMonthly: number;
  moduleDetails: { id: string; name: string; price: number; included: boolean }[];
}

export interface UsePriceCalculatorReturn {
  // Data
  plans: Plan[];
  modules: Module[];
  isLoading: boolean;
  error: Error | null;
  
  // Selected state
  selectedPlanId: string | null;
  selectedUserCount: number;
  selectedModuleIds: string[];
  
  // Setters
  setSelectedPlanId: (id: string | null) => void;
  setSelectedUserCount: (count: number) => void;
  setSelectedModuleIds: (ids: string[]) => void;
  toggleModule: (id: string) => void;
  
  // Calculated
  priceBreakdown: PriceBreakdown | null;
  isCalculating: boolean;
}

export function usePriceCalculator(
  initialPlanId?: string,
  initialUserCount = 5,
  initialModuleIds: string[] = []
): UsePriceCalculatorReturn {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(initialPlanId || null);
  const [selectedUserCount, setSelectedUserCount] = useState(initialUserCount);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>(initialModuleIds);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch plans
  const { data: plans = [], isLoading: plansLoading, error: plansError } = useQuery({
    queryKey: ['plans-dynamic'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name, display_name, description, base_price_monthly, price_per_user, included_users, max_users, is_active, is_custom')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return (data || []) as Plan[];
    },
  });

  // Fetch modules
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

  // Calculate price when inputs change
  const calculatePrice = useCallback(async () => {
    if (!selectedPlanId || selectedUserCount < 1) {
      setPriceBreakdown(null);
      return;
    }

    setIsCalculating(true);
    try {
      const { data, error } = await supabase.rpc('calculate_subscription_price', {
        p_plan_id: selectedPlanId,
        p_user_count: selectedUserCount,
        p_module_ids: selectedModuleIds,
      });

      if (error) throw error;

      // Type the response
      const priceData = data as {
        base_price: number;
        included_users: number;
        extra_users: number;
        price_per_user: number;
        user_price: number;
        module_price: number;
        total_monthly: number;
      };

      // Build module details
      const moduleDetails = selectedModuleIds.map(moduleId => {
        const mod = modules.find(m => m.id === moduleId);
        return {
          id: moduleId,
          name: mod?.name || 'Unknown',
          price: mod?.base_price_monthly || 0,
          included: false, // Will be updated based on plan
        };
      });

      setPriceBreakdown({
        basePrice: priceData.base_price || 0,
        includedUsers: priceData.included_users || 1,
        extraUsers: priceData.extra_users || 0,
        pricePerUser: priceData.price_per_user || 0,
        userPrice: priceData.user_price || 0,
        modulePrice: priceData.module_price || 0,
        totalMonthly: priceData.total_monthly || 0,
        moduleDetails,
      });
    } catch (err) {
      console.error('Price calculation error:', err);
      setPriceBreakdown(null);
    } finally {
      setIsCalculating(false);
    }
  }, [selectedPlanId, selectedUserCount, selectedModuleIds, modules]);

  // Debounced price calculation
  useEffect(() => {
    const timer = setTimeout(() => {
      calculatePrice();
    }, 300);

    return () => clearTimeout(timer);
  }, [calculatePrice]);

  // Toggle module selection
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
    setSelectedPlanId,
    setSelectedUserCount,
    setSelectedModuleIds,
    toggleModule,
    priceBreakdown,
    isCalculating,
  };
}

// Format price from cents to display format
export function formatPrice(cents: number, currency = 'SAR'): string {
  return new Intl.NumberFormat('en-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
