/**
 * Admin Edit Observation Dialog
 * Allows admins to edit observation location (branch/site) and contractor assignment
 * with optional re-routing to the new site's Department Representative
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Loader2, MapPin, Building2, Users, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBranches } from '@/hooks/use-branches';
import { useSites } from '@/hooks/use-sites';
import { useAdminEditObservation } from '@/features/admin';

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

  // Form state
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null);
  const [shouldReroute, setShouldReroute] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedBranchId(incident.branch_id || incident.branch?.id || null);
      setSelectedSiteId(incident.site_id || incident.site?.id || null);
      setSelectedContractorId((incident as Record<string, unknown>).related_contractor_company_id as string || null);
      setShouldReroute(false);
      setAdminNotes('');
    }
  }, [open, incident]);

  // Fetch data
  const { data: branches, isLoading: loadingBranches } = useBranches();
  const { data: sites, isLoading: loadingSites } = useSites(selectedBranchId || undefined);

  // Fetch contractor companies - use company_name column per schema
  const { data: contractors, isLoading: loadingContractors } = useQuery({
    queryKey: ['contractor-companies-for-edit', selectedBranchId],
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

  // Mutation
  const editMutation = useAdminEditObservation();

  // Check if any changes were made
  const hasChanges =
    selectedBranchId !== (incident.branch_id || incident.branch?.id) ||
    selectedSiteId !== (incident.site_id || incident.site?.id) ||
    selectedContractorId !== (incident as any).related_contractor_company_id;

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    setSelectedSiteId(null); // Reset site when branch changes
  };

  const handleSubmit = async () => {
    await editMutation.mutateAsync({
      incidentId: incident.id,
      branchId: selectedBranchId,
      siteId: selectedSiteId,
      contractorCompanyId: selectedContractorId,
      shouldReroute,
      adminNotes: adminNotes.trim() || undefined,
    });
    onOpenChange(false);
    onSuccess?.();
  };

  // Get display names for preview
  const selectedBranchName = branches?.find(b => b.id === selectedBranchId)?.name;
  const selectedSiteName = sites?.find(s => s.id === selectedSiteId)?.name;
  const selectedContractorName = isRTL
    ? contractors?.find(c => c.id === selectedContractorId)?.company_name_ar || contractors?.find(c => c.id === selectedContractorId)?.company_name
    : contractors?.find(c => c.id === selectedContractorId)?.company_name;

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

        <div className="space-y-6 py-4">
          {/* Branch Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t('common.branch', 'Branch')}
            </Label>
            <Select
              value={selectedBranchId || ''}
              onValueChange={handleBranchChange}
              disabled={loadingBranches}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('admin.editObservation.selectBranch', 'Select branch...')} />
              </SelectTrigger>
              <SelectContent>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
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
            <Select
              value={selectedSiteId || ''}
              onValueChange={setSelectedSiteId}
              disabled={loadingSites || !selectedBranchId}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedBranchId
                    ? t('admin.editObservation.selectBranchFirst', 'Select branch first...')
                    : t('admin.editObservation.selectSite', 'Select site...')
                } />
              </SelectTrigger>
              <SelectContent>
                {sites?.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contractor Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('common.contractor', 'Contractor Company')}
            </Label>
            <div className="flex gap-2">
              <Select
                value={selectedContractorId || ''}
                onValueChange={setSelectedContractorId}
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
              {selectedContractorId && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedContractorId(null)}
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
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2 font-medium">
                    <RefreshCw className="h-4 w-4" />
                    {t('admin.editObservation.reroute', 'Re-route to New Location')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('admin.editObservation.rerouteHint', 'Assign to the Department Representative of the new site')}
                  </p>
                </div>
                <Switch
                  checked={shouldReroute}
                  onCheckedChange={setShouldReroute}
                />
              </div>

              {shouldReroute && (
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
          <div className="space-y-2">
            <Label>{t('admin.editObservation.notes', 'Admin Notes (Optional)')}</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={t('admin.editObservation.notesPlaceholder', 'Reason for this change...')}
              className="min-h-[80px]"
            />
          </div>

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
                {!selectedContractorId && (incident as any).related_contractor_company_id && (
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">{t('common.contractor', 'Contractor')}</Badge>
                    <span className="text-muted-foreground">{t('common.removed', 'Removed')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={editMutation.isPending}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || editMutation.isPending}
          >
            {editMutation.isPending && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {shouldReroute
              ? t('admin.editObservation.saveAndReroute', 'Save & Re-route')
              : t('common.save', 'Save Changes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

