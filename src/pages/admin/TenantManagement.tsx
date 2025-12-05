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
import { usePaginatedQuery } from '@/hooks/use-paginated-query';
import { PaginationControls } from '@/components/ui/pagination-controls';
import type { Tables } from '@/integrations/supabase/types';

type Tenant = Tables<'tenants'>;
type TenantStatus = 'active' | 'suspended' | 'disabled';

const PAGE_SIZE = 25;

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

  // Paginated tenant fetch with server-side search
  const {
    data: paginatedData,
    isLoading,
    page,
    totalPages,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    refetch,
  } = usePaginatedQuery<Tenant>({
    queryKey: ['tenants', searchQuery],
    queryFn: async ({ from, to }) => {
      let query = supabase
        .from('tenants')
        .select(`
          id, name, slug, status, industry, country, city,
          plan_id, max_users_override, trial_start_date, trial_end_date,
          created_at, updated_at
        `, { count: 'exact' })
        .order('name');

      // Server-side search
      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%,contact_email.ilike.%${searchQuery}%,industry.ilike.%${searchQuery}%`);
      }

      const { data, count, error } = await query.range(from, to);
      if (error) throw error;
      return { data: data as Tenant[], count: count || 0 };
    },
    pageSize: PAGE_SIZE,
  });

  const tenants = paginatedData?.data || [];

  // Fetch user counts per tenant using RPC (bypasses RLS for cross-tenant counts)
  const { data: userCounts = {} } = useQuery({
    queryKey: ['tenant-user-counts', tenants.map(t => t.id).join(',')],
    queryFn: async () => {
      if (tenants.length === 0) return {};
      
      const { data, error } = await supabase
        .rpc('get_tenant_user_counts', { 
          p_tenant_ids: tenants.map(t => t.id) 
        });
      if (error) throw error;
      
      // Convert array to record for easy lookup
      const counts: Record<string, number> = {};
      (data || []).forEach((row: { tenant_id: string; user_count: number }) => {
        counts[row.tenant_id] = row.user_count;
      });
      return counts;
    },
    enabled: tenants.length > 0,
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

  // Server-side search is now handled in the query

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
            tenants={tenants}
            isLoading={isLoading}
            userCounts={userCounts}
            onEdit={handleEdit}
            onStatusChange={handleStatusChange}
            onManageInvitations={handleManageInvitations}
          />
          {totalCount > 0 && (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              hasNextPage={hasNextPage}
              hasPreviousPage={hasPreviousPage}
              isLoading={isLoading}
              onNextPage={goToNextPage}
              onPreviousPage={goToPreviousPage}
              onFirstPage={goToFirstPage}
              className="mt-4"
            />
          )}
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
