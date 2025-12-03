import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Building2 } from 'lucide-react';
import { TenantListTable } from '@/components/tenants/TenantListTable';
import { TenantFormDialog } from '@/components/tenants/TenantFormDialog';
import { TenantStatusDialog } from '@/components/tenants/TenantStatusDialog';
import { TenantDetailDialog } from '@/components/tenants/TenantDetailDialog';
import type { Tables } from '@/integrations/supabase/types';

type Tenant = Tables<'tenants'>;
type TenantStatus = 'active' | 'suspended' | 'disabled';

export default function TenantManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; tenant: Tenant | null; newStatus: TenantStatus | null }>({
    open: false,
    tenant: null,
    newStatus: null,
  });
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailTenant, setDetailTenant] = useState<Tenant | null>(null);

  // Fetch tenants
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Tenant[];
    },
  });

  // Create tenant mutation
  const createMutation = useMutation({
    mutationFn: async (values: Partial<Tenant> & { name: string; slug: string }) => {
      const { data, error } = await supabase
        .from('tenants')
        .insert([values])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setFormDialogOpen(false);
      toast({
        title: t('tenantManagement.toast.created'),
        description: t('tenantManagement.toast.createdDescription'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update tenant mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Tenant> }) => {
      const { data, error } = await supabase
        .from('tenants')
        .update(values)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setFormDialogOpen(false);
      setEditingTenant(null);
      toast({
        title: t('tenantManagement.toast.updated'),
        description: t('tenantManagement.toast.updatedDescription'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update status mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TenantStatus }) => {
      const { data, error } = await supabase
        .from('tenants')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setStatusDialog({ open: false, tenant: null, newStatus: null });
      toast({
        title: t('tenantManagement.toast.statusUpdated'),
        description: t('tenantManagement.toast.statusUpdatedDescription'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Filter tenants by search
  const filteredTenants = tenants.filter((tenant) =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    setEditingTenant(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormDialogOpen(true);
  };

  const handleStatusChange = (tenant: Tenant, newStatus: TenantStatus) => {
    setStatusDialog({ open: true, tenant, newStatus });
  };

  const handleManageInvitations = (tenant: Tenant) => {
    setDetailTenant(tenant);
    setDetailDialogOpen(true);
  };

  const handleFormSubmit = (values: Partial<Tenant> & { name: string; slug: string }) => {
    if (editingTenant) {
      updateMutation.mutate({ id: editingTenant.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleStatusConfirm = () => {
    if (statusDialog.tenant && statusDialog.newStatus) {
      statusMutation.mutate({ id: statusDialog.tenant.id, status: statusDialog.newStatus });
    }
  };

  if (!profile?.tenant_id) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">{t('orgStructure.noTenant')}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>{t('tenantManagement.title')}</CardTitle>
                <CardDescription>{t('tenantManagement.description')}</CardDescription>
              </div>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 me-2" />
              {t('tenantManagement.addTenant')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('tenantManagement.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-9"
              />
            </div>
          </div>

          {/* Table */}
          <TenantListTable
            tenants={filteredTenants}
            isLoading={isLoading}
            onEdit={handleEdit}
            onStatusChange={handleStatusChange}
            onManageInvitations={handleManageInvitations}
          />
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <TenantFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        tenant={editingTenant}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Status Change Dialog */}
      <TenantStatusDialog
        open={statusDialog.open}
        onOpenChange={(open) => setStatusDialog({ ...statusDialog, open })}
        tenant={statusDialog.tenant}
        newStatus={statusDialog.newStatus}
        onConfirm={handleStatusConfirm}
        isSubmitting={statusMutation.isPending}
      />

      {/* Detail Dialog with Invitations */}
      <TenantDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        tenant={detailTenant}
      />
    </div>
  );
}
