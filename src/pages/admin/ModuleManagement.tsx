import { useState } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { formatPrice } from "@/hooks/use-price-calculator";
import { Plus, Pencil, Trash2, Package, DollarSign } from "lucide-react";

interface Module {
  id: string;
  code: string;
  name: string;
  description: string | null;
  base_price_monthly: number;
  base_price_yearly: number;
  is_active: boolean;
  sort_order: number;
  icon: string | null;
}

export default function ModuleManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editModule, setEditModule] = useState<Module | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    base_price_monthly: 0,
    base_price_yearly: 0,
    is_active: true,
    sort_order: 0,
    icon: 'Package',
  });

  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['admin-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('id, code, name, description, base_price_monthly, base_price_yearly, is_active, sort_order, icon')
        .is('deleted_at', null)
        .order('sort_order');
      if (error) throw error;
      return data as Module[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('modules')
          .update({
            name: data.name,
            description: data.description || null,
            base_price_monthly: data.base_price_monthly,
            base_price_yearly: data.base_price_yearly,
            is_active: data.is_active,
            sort_order: data.sort_order,
            icon: data.icon,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('modules')
          .insert({
            code: data.code,
            name: data.name,
            description: data.description || null,
            base_price_monthly: data.base_price_monthly,
            base_price_yearly: data.base_price_yearly,
            is_active: data.is_active,
            sort_order: data.sort_order,
            icon: data.icon,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: t('common.success'), description: t('adminModules.moduleSaved') });
      queryClient.invalidateQueries({ queryKey: ['admin-modules'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - set deleted_at timestamp
      const { error } = await supabase
        .from('modules')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t('common.success'), description: t('adminModules.moduleDeleted') });
      queryClient.invalidateQueries({ queryKey: ['admin-modules'] });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      base_price_monthly: 0,
      base_price_yearly: 0,
      is_active: true,
      sort_order: modules.length + 1,
      icon: 'Package',
    });
    setEditModule(null);
  };

  const handleEdit = (module: Module) => {
    setEditModule(module);
    setFormData({
      code: module.code,
      name: module.name,
      description: module.description || '',
      base_price_monthly: module.base_price_monthly,
      base_price_yearly: module.base_price_yearly,
      is_active: module.is_active,
      sort_order: module.sort_order,
      icon: module.icon || 'Package',
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    saveMutation.mutate(editModule ? { ...formData, id: editModule.id } : formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('adminModules.title')}</h1>
          <p className="text-muted-foreground">{t('adminModules.description')}</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 me-2" />
          {t('adminModules.addModule')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('adminModules.allModules')}
          </CardTitle>
          <CardDescription>{t('adminModules.allModulesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('adminModules.name')}</TableHead>
                <TableHead>{t('adminModules.code')}</TableHead>
                <TableHead>{t('adminModules.monthlyPrice')}</TableHead>
                <TableHead>{t('adminModules.yearlyPrice')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-end">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">{t('common.loading')}</TableCell>
                </TableRow>
              ) : modules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t('adminModules.noModules')}
                  </TableCell>
                </TableRow>
              ) : (
                modules.map((module) => (
                  <TableRow key={module.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{module.name}</p>
                        {module.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{module.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{module.code}</code>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatPrice(module.base_price_monthly)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatPrice(module.base_price_yearly)}</span>
                      <span className="text-xs text-muted-foreground ms-1">/yr</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={module.is_active ? 'default' : 'secondary'}>
                        {module.is_active ? t('common.active') : t('adminModules.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(module)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(t('adminModules.confirmDelete'))) {
                            deleteMutation.mutate(module.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editModule ? t('adminModules.editModule') : t('adminModules.addModule')}
            </DialogTitle>
            <DialogDescription>
              {editModule ? t('adminModules.editModuleDesc') : t('adminModules.addModuleDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!editModule && (
              <div className="space-y-2">
                <Label>{t('adminModules.code')}</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  placeholder="e.g. training_management"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('adminModules.name')}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Training Management"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('adminModules.descriptionLabel')}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this module..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {t('adminModules.monthlyPrice')}
                </Label>
                <Input
                  type="number"
                  value={formData.base_price_monthly / 100}
                  onChange={(e) => setFormData({ ...formData, base_price_monthly: parseFloat(e.target.value) * 100 || 0 })}
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {t('adminModules.yearlyPrice')}
                </Label>
                <Input
                  type="number"
                  value={formData.base_price_yearly / 100}
                  onChange={(e) => setFormData({ ...formData, base_price_yearly: parseFloat(e.target.value) * 100 || 0 })}
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>{t('adminModules.activeStatus')}</Label>
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
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
