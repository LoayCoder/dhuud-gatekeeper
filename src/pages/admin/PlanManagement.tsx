import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/hooks/use-price-calculator";
import { Plus, Pencil, Trash2, Crown, Rocket, Building2, Sparkles, Loader2, ArrowUpDown } from "lucide-react";

type StatusFilter = 'all' | 'active' | 'inactive';
type SortField = 'sort_order' | 'price' | 'max_users';
type SortDirection = 'asc' | 'desc';

interface Plan {
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
  sort_order: number;
}

interface Module {
  id: string;
  code: string;
  name: string;
}

export default function PlanManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('sort_order');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    base_price_monthly: 0,
    price_yearly: 0,
    price_per_user: 0,
    price_per_user_yearly: 0,
    included_users: 1,
    max_users: 10,
    is_active: true,
    is_custom: false,
    sort_order: 0,
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as Plan[];
    },
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules-for-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('id, code, name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as Module[];
    },
  });

  const { data: planModules = [] } = useQuery({
    queryKey: ['plan-modules', editPlan?.id],
    queryFn: async () => {
      if (!editPlan?.id) return [];
      const { data, error } = await supabase
        .from('plan_modules')
        .select('module_id')
        .eq('plan_id', editPlan.id);
      if (error) throw error;
      return data.map(pm => pm.module_id).filter(Boolean) as string[];
    },
    enabled: !!editPlan?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      let planId = data.id;
      
      if (data.id) {
        const { error } = await supabase
          .from('plans')
          .update({
            display_name: data.display_name,
            description: data.description || null,
            base_price_monthly: data.base_price_monthly,
            price_monthly: data.base_price_monthly,
            price_yearly: data.price_yearly,
            price_per_user: data.price_per_user,
            price_per_user_yearly: data.price_per_user_yearly,
            included_users: data.included_users,
            max_users: data.max_users,
            is_active: data.is_active,
            is_custom: data.is_custom,
            sort_order: data.sort_order,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { data: newPlan, error } = await supabase
          .from('plans')
          .insert({
            name: data.name.toLowerCase().replace(/\s/g, '_'),
            display_name: data.display_name,
            description: data.description || null,
            base_price_monthly: data.base_price_monthly,
            price_monthly: data.base_price_monthly,
            price_yearly: data.price_yearly,
            price_per_user: data.price_per_user,
            price_per_user_yearly: data.price_per_user_yearly,
            included_users: data.included_users,
            max_users: data.max_users,
            is_active: data.is_active,
            is_custom: data.is_custom,
            sort_order: data.sort_order,
          })
          .select('id')
          .single();
        if (error) throw error;
        planId = newPlan.id;
      }

      // Update plan modules
      if (planId) {
        await supabase.from('plan_modules').delete().eq('plan_id', planId);
        
        if (selectedModules.length > 0) {
          const moduleInserts = selectedModules.map(moduleId => {
            const mod = modules.find(m => m.id === moduleId);
            return {
              plan_id: planId,
              module_id: moduleId,
              module: mod?.code as any,
              included_in_base: true,
            };
          });
          
          const { error: moduleError } = await supabase
            .from('plan_modules')
            .insert(moduleInserts);
          if (moduleError) throw moduleError;
        }
      }
    },
    onSuccess: () => {
      toast({ title: t('common.success'), description: t('adminPlans.planSaved') });
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      queryClient.invalidateQueries({ queryKey: ['plan-modules'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      // First delete plan_modules associations
      await supabase.from('plan_modules').delete().eq('plan_id', planId);
      // Then delete the plan
      const { error } = await supabase.from('plans').delete().eq('id', planId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t('common.success'), description: t('adminPlans.planDeleted') });
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      display_name: '',
      description: '',
      base_price_monthly: 0,
      price_yearly: 0,
      price_per_user: 0,
      price_per_user_yearly: 0,
      included_users: 1,
      max_users: 10,
      is_active: true,
      is_custom: false,
      sort_order: plans.length + 1,
    });
    setSelectedModules([]);
    setEditPlan(null);
  };

  const handleEdit = (plan: Plan) => {
    setEditPlan(plan);
    setFormData({
      name: plan.name,
      display_name: plan.display_name,
      description: plan.description || '',
      base_price_monthly: plan.base_price_monthly,
      price_yearly: plan.price_yearly || 0,
      price_per_user: plan.price_per_user,
      price_per_user_yearly: plan.price_per_user_yearly,
      included_users: plan.included_users,
      max_users: plan.max_users,
      is_active: plan.is_active,
      is_custom: plan.is_custom || false,
      sort_order: plan.sort_order,
    });
    setIsDialogOpen(true);
  };

  // Set selected modules when editing
  useEffect(() => {
    if (planModules.length > 0) {
      setSelectedModules(planModules);
    }
  }, [planModules]);

  const handleCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.display_name.trim()) {
      toast({ 
        title: t('common.error'), 
        description: t('adminPlans.displayNameRequired'), 
        variant: 'destructive' 
      });
      return;
    }

    // Price validation (prices can be 0 for free plans, but not negative)
    if (formData.base_price_monthly < 0 || formData.price_yearly < 0 || 
        formData.price_per_user < 0 || formData.price_per_user_yearly < 0) {
      toast({ 
        title: t('common.error'), 
        description: t('adminPlans.pricesMustBePositive'), 
        variant: 'destructive' 
      });
      return;
    }

    // User limits validation (must be at least 1)
    if (formData.included_users < 1 || formData.max_users < 1) {
      toast({ 
        title: t('common.error'), 
        description: t('adminPlans.userLimitsMustBePositive'), 
        variant: 'destructive' 
      });
      return;
    }

    // Logical constraint (included ≤ max)
    if (formData.included_users > formData.max_users) {
      toast({ 
        title: t('common.error'), 
        description: t('adminPlans.includedUsersMustNotExceedMax'), 
        variant: 'destructive' 
      });
      return;
    }

    if (selectedModules.length === 0) {
      toast({ 
        title: t('common.error'), 
        description: t('adminPlans.atLeastOneModule'), 
        variant: 'destructive' 
      });
      return;
    }

    saveMutation.mutate(editPlan ? { ...formData, id: editPlan.id } : formData);
  };

  const handleDeleteClick = (plan: Plan) => {
    setPlanToDelete(plan);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (planToDelete) {
      deleteMutation.mutate(planToDelete.id);
    }
  };

  const getPlanIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'starter': return <Rocket className="h-4 w-4" />;
      case 'pro': return <Crown className="h-4 w-4" />;
      case 'enterprise': return <Building2 className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  // Filter and sort plans
  const filteredPlans = useMemo(() => {
    let result = [...plans];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(plan => 
        plan.display_name.toLowerCase().includes(query) ||
        plan.name.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(plan => 
        statusFilter === 'active' ? plan.is_active : !plan.is_active
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'price':
          comparison = a.base_price_monthly - b.base_price_monthly;
          break;
        case 'max_users':
          comparison = a.max_users - b.max_users;
          break;
        case 'sort_order':
        default:
          comparison = a.sort_order - b.sort_order;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [plans, searchQuery, statusFilter, sortField, sortDirection]);

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('adminPlans.title')}</h1>
          <p className="text-muted-foreground">{t('adminPlans.description')}</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 me-2" />
          {t('adminPlans.addPlan')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('adminPlans.allPlans')}</CardTitle>
          <CardDescription>{t('adminPlans.allPlansDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter and Sort Controls */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <Input
              placeholder={t('adminPlans.searchPlans')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48"
            />
            
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">{t('adminPlans.filterByStatus')}</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="active">{t('common.active')}</SelectItem>
                  <SelectItem value="inactive">{t('adminPlans.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">{t('adminPlans.sortBy')}</Label>
              <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sort_order">{t('adminPlans.defaultOrder')}</SelectItem>
                  <SelectItem value="price">{t('adminPlans.pricing')}</SelectItem>
                  <SelectItem value="max_users">{t('adminPlans.maxUsers')}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={toggleSortDirection} title={sortDirection === 'asc' ? t('adminPlans.ascending') : t('adminPlans.descending')}>
                <ArrowUpDown className={`h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('adminPlans.name')}</TableHead>
                <TableHead>{t('adminPlans.pricing')}</TableHead>
                <TableHead>{t('adminPlans.users')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-end">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">{t('common.loading')}</TableCell>
                </TableRow>
              ) : filteredPlans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t('adminPlans.noPlans')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPlanIcon(plan.name)}
                        <div>
                          <p className="font-medium">{plan.display_name}</p>
                          {plan.is_custom && <Badge variant="outline" className="text-xs">Custom</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div>
                          <span className="font-medium">{formatPrice(plan.base_price_monthly)}</span>
                          <span className="text-xs text-muted-foreground">/mo</span>
                        </div>
                        {plan.price_yearly && (
                          <div className="text-xs text-muted-foreground">
                            {formatPrice(plan.price_yearly)}/yr
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span>{plan.included_users} included</span>
                        <span className="text-muted-foreground"> / {plan.max_users} max</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        +{formatPrice(plan.price_per_user)}/user
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                        {plan.is_active ? t('common.active') : t('adminPlans.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(plan)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editPlan ? t('adminPlans.editPlan') : t('adminPlans.addPlan')}</DialogTitle>
            <DialogDescription>
              {editPlan ? t('adminPlans.editPlanDesc') : t('adminPlans.addPlanDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('adminPlans.displayName')}</Label>
                <Input
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="e.g. Professional"
                />
              </div>
              {!editPlan && (
                <div className="space-y-2">
                  <Label>{t('adminPlans.internalName')}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                    placeholder="e.g. professional"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('adminPlans.descriptionLabel')}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('adminPlans.monthlyPrice')}</Label>
                <Input
                  type="number"
                  value={formData.base_price_monthly / 100}
                  onChange={(e) => setFormData({ ...formData, base_price_monthly: parseFloat(e.target.value) * 100 || 0 })}
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('adminPlans.yearlyPrice')}</Label>
                <Input
                  type="number"
                  value={formData.price_yearly / 100}
                  onChange={(e) => setFormData({ ...formData, price_yearly: parseFloat(e.target.value) * 100 || 0 })}
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('adminPlans.pricePerUserMonthly')}</Label>
                <Input
                  type="number"
                  value={formData.price_per_user / 100}
                  onChange={(e) => setFormData({ ...formData, price_per_user: parseFloat(e.target.value) * 100 || 0 })}
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('adminPlans.pricePerUserYearly')}</Label>
                <Input
                  type="number"
                  value={formData.price_per_user_yearly / 100}
                  onChange={(e) => setFormData({ ...formData, price_per_user_yearly: parseFloat(e.target.value) * 100 || 0 })}
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('adminPlans.includedUsers')}</Label>
                <Input
                  type="number"
                  value={formData.included_users}
                  onChange={(e) => setFormData({ ...formData, included_users: parseInt(e.target.value) || 1 })}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('adminPlans.maxUsers')}</Label>
                <Input
                  type="number"
                  value={formData.max_users}
                  onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 1 })}
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>{t('adminPlans.includedModules')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {modules.map((module) => (
                  <div key={module.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={module.id}
                      checked={selectedModules.includes(module.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedModules([...selectedModules, module.id]);
                        } else {
                          setSelectedModules(selectedModules.filter(id => id !== module.id));
                        }
                      }}
                    />
                    <label htmlFor={module.id} className="text-sm">{module.name}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>{t('adminPlans.isActive')}</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('adminPlans.confirmDeletePlan')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('adminPlans.confirmDeletePlanDesc', { planName: planToDelete?.display_name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              {t('adminPlans.deletePlan')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
