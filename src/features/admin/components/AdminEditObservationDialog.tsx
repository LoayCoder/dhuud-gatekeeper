/**
 * Admin Edit Observation Dialog
 * Allows admins to edit observation location (branch/site) and contractor assignment
 * with optional re-routing to the new site's Department Representative
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Loader2, MapPin, Building2, Users, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBranches } from '@/hooks/use-branches';
import { useSites } from '@/hooks/use-sites';
import { useAdminEditObservation } from '@/features/admin';
import { adminEditObservationSchema, type AdminEditObservationFormValues } from './AdminEditObservationSchema';

interface AdminEditObservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incident: {
    id: string;
    branch_id?: string | null;
    site_id?: string | null;
    related_contractor_company_id?: string | null;
    branch?: { id?: string; name: string } | null;
    site?: { id?: string; name: string } | null;
    status?: string | null;
  };
  onSuccess?: () => void;
}

export function AdminEditObservationDialog({
  open,
  onOpenChange,
  incident,
  onSuccess,
}: AdminEditObservationDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const isRTL = direction === 'rtl';

  const form = useForm<AdminEditObservationFormValues>({
    resolver: zodResolver(adminEditObservationSchema),
    defaultValues: {
      branchId: null, siteId: null, contractorId: null, shouldReroute: false, adminNotes: '',
    },
  });

  const watchedBranchId = form.watch('branchId');
  const watchedSiteId = form.watch('siteId');
  const watchedContractorId = form.watch('contractorId');
  const watchedShouldReroute = form.watch('shouldReroute');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        branchId: incident.branch_id || incident.branch?.id || null,
        siteId: incident.site_id || incident.site?.id || null,
        contractorId: (incident as any).related_contractor_company_id || null,
        shouldReroute: false,
        adminNotes: '',
      });
    }
  }, [open, incident, form]);

  // Fetch data
  const { data: branches, isLoading: loadingBranches } = useBranches();
  const { data: sites, isLoading: loadingSites } = useSites(watchedBranchId || undefined);

  const { data: contractors, isLoading: loadingContractors } = useQuery({
    queryKey: ['contractor-companies-for-edit', watchedBranchId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      if (!profile) return [];
      const { data, error } = await supabase
        .from('contractor_companies')
        .select('id, company_name, company_name_ar')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .eq('status', 'active')
        .order('company_name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const editMutation = useAdminEditObservation();

  const hasChanges =
    watchedBranchId !== (incident.branch_id || incident.branch?.id) ||
    watchedSiteId !== (incident.site_id || incident.site?.id) ||
    watchedContractorId !== (incident as any).related_contractor_company_id;

  const handleBranchChange = (branchId: string) => {
    form.setValue('branchId', branchId);
    form.setValue('siteId', null);
  };

  const onSubmit = async (values: AdminEditObservationFormValues) => {
    await editMutation.mutateAsync({
      incidentId: incident.id,
      branchId: values.branchId,
      siteId: values.siteId,
      contractorCompanyId: values.contractorId,
      shouldReroute: values.shouldReroute,
      adminNotes: values.adminNotes.trim() || undefined,
    });
    onOpenChange(false);
    onSuccess?.();
  };

  const selectedBranchName = branches?.find(b => b.id === watchedBranchId)?.name;
  const selectedSiteName = sites?.find(s => s.id === watchedSiteId)?.name;
  const selectedContractorName = isRTL
    ? contractors?.find(c => c.id === watchedContractorId)?.company_name_ar || contractors?.find(c => c.id === watchedContractorId)?.company_name
    : contractors?.find(c => c.id === watchedContractorId)?.company_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {t('admin.editObservation.title', 'Edit Observation')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.editObservation.description', 'Change the location or contractor assignment for this observation.')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            {/* Branch Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t('common.branch', 'Branch')}
              </Label>
              <Select
                value={watchedBranchId || ''}
                onValueChange={handleBranchChange}
                disabled={loadingBranches}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.editObservation.selectBranch', 'Select branch...')} />
                </SelectTrigger>
                <SelectContent>
                  {branches?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Site Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t('common.site', 'Site')}
              </Label>
              <Controller
                control={form.control}
                name="siteId"
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    disabled={loadingSites || !watchedBranchId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !watchedBranchId
                          ? t('admin.editObservation.selectBranchFirst', 'Select branch first...')
                          : t('admin.editObservation.selectSite', 'Select site...')
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {sites?.map((site) => (
                        <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Contractor Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('common.contractor', 'Contractor Company')}
              </Label>
              <div className="flex gap-2">
                <Controller
                  control={form.control}
                  name="contractorId"
                  render={({ field }) => (
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      disabled={loadingContractors}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={t('admin.editObservation.selectContractor', 'Select contractor (optional)...')} />
                      </SelectTrigger>
                      <SelectContent>
                        {contractors?.map((contractor) => (
                          <SelectItem key={contractor.id} value={contractor.id}>
                            {isRTL ? (contractor.company_name_ar || contractor.company_name) : contractor.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {watchedContractorId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => form.setValue('contractorId', null)}
                    title={t('common.clear', 'Clear')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('admin.editObservation.contractorHint', 'Leave empty for non-contractor observations')}
              </p>
            </div>

            {/* Re-route Toggle */}
            {hasChanges && (
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <FormField control={form.control} name="shouldReroute" render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0">
                    <div className="space-y-1">
                      <FormLabel className="flex items-center gap-2 font-medium">
                        <RefreshCw className="h-4 w-4" />
                        {t('admin.editObservation.reroute', 'Re-route to New Location')}
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        {t('admin.editObservation.rerouteHint', 'Assign to the Department Representative of the new site')}
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                {watchedShouldReroute && (
                  <Alert className="border-warning/30 bg-warning/5">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-sm">
                      {t('admin.editObservation.rerouteWarning', 'The workflow will restart with the new assignee. Current progress may be affected.')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Admin Notes */}
            <FormField control={form.control} name="adminNotes" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('admin.editObservation.notes', 'Admin Notes (Optional)')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={t('admin.editObservation.notesPlaceholder', 'Reason for this change...')}
                    className="min-h-[80px]"
                  />
                </FormControl>
              </FormItem>
            )} />

            {/* Preview */}
            {hasChanges && (
              <div className="p-4 rounded-lg border bg-muted/20">
                <p className="text-sm font-medium mb-2">
                  {t('admin.editObservation.preview', 'Changes Preview')}
                </p>
                <div className="space-y-1 text-sm">
                  {selectedBranchName && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{t('common.branch', 'Branch')}</Badge>
                      <span>{selectedBranchName}</span>
                    </div>
                  )}
                  {selectedSiteName && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{t('common.site', 'Site')}</Badge>
                      <span>{selectedSiteName}</span>
                    </div>
                  )}
                  {selectedContractorName && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{t('common.contractor', 'Contractor')}</Badge>
                      <span>{selectedContractorName}</span>
                    </div>
                  )}
                  {!watchedContractorId && (incident as any).related_contractor_company_id && (
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">{t('common.contractor', 'Contractor')}</Badge>
                      <span className="text-muted-foreground">{t('common.removed', 'Removed')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={editMutation.isPending}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={!hasChanges || editMutation.isPending}
              >
                {editMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                {watchedShouldReroute
                  ? t('admin.editObservation.saveAndReroute', 'Save & Re-route')
                  : t('common.save', 'Save Changes')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
