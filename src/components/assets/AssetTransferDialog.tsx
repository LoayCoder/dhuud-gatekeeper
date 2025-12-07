import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateTransferRequest, TransferType, DisposalMethod } from '@/hooks/use-asset-transfers';
import { useTenantCurrency } from '@/hooks/use-tenant-currency';
import { MapPin, Trash2, Power } from 'lucide-react';

interface AssetTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: {
    id: string;
    name: string;
    asset_code: string;
    branch_id?: string | null;
    site_id?: string | null;
    building_id?: string | null;
    floor_zone_id?: string | null;
  };
  defaultType?: TransferType;
}

const transferSchema = z.object({
  transfer_type: z.enum(['location_transfer', 'disposal', 'decommission']),
  to_branch_id: z.string().optional(),
  to_site_id: z.string().optional(),
  to_building_id: z.string().optional(),
  to_floor_zone_id: z.string().optional(),
  disposal_method: z.enum(['sold', 'scrapped', 'donated', 'recycled', 'returned']).optional(),
  disposal_value: z.number().optional(),
  disposal_notes: z.string().optional(),
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof transferSchema>;

export function AssetTransferDialog({ open, onOpenChange, asset, defaultType = 'location_transfer' }: AssetTransferDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { currency } = useTenantCurrency();
  const createTransfer = useCreateTransferRequest();
  const [activeTab, setActiveTab] = useState<TransferType>(defaultType);

  const form = useForm<FormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      transfer_type: defaultType,
      reason: '',
      notes: '',
    },
  });

  const selectedBranchId = form.watch('to_branch_id');
  const selectedSiteId = form.watch('to_site_id');
  const selectedBuildingId = form.watch('to_building_id');

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch sites for selected branch
  const { data: sites = [] } = useQuery({
    queryKey: ['sites', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return [];
      const { data, error } = await supabase
        .from('sites')
        .select('id, name')
        .eq('branch_id', selectedBranchId)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedBranchId,
  });

  // Fetch buildings for selected site
  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings', selectedSiteId],
    queryFn: async () => {
      if (!selectedSiteId) return [];
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, name_ar')
        .eq('site_id', selectedSiteId)
        .is('deleted_at', null)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSiteId,
  });

  // Fetch floors for selected building
  const { data: floors = [] } = useQuery({
    queryKey: ['floors', selectedBuildingId],
    queryFn: async () => {
      if (!selectedBuildingId) return [];
      const { data, error } = await supabase
        .from('floors_zones')
        .select('id, name, name_ar')
        .eq('building_id', selectedBuildingId)
        .is('deleted_at', null)
        .order('level_number');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedBuildingId,
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value as TransferType);
    form.setValue('transfer_type', value as TransferType);
  };

  const onSubmit = async (data: FormData) => {
    await createTransfer.mutateAsync({
      asset_id: asset.id,
      transfer_type: activeTab,
      from_branch_id: asset.branch_id,
      from_site_id: asset.site_id,
      from_building_id: asset.building_id,
      from_floor_zone_id: asset.floor_zone_id,
      to_branch_id: data.to_branch_id || null,
      to_site_id: data.to_site_id || null,
      to_building_id: data.to_building_id || null,
      to_floor_zone_id: data.to_floor_zone_id || null,
      disposal_method: data.disposal_method as DisposalMethod || null,
      disposal_value: data.disposal_value || null,
      disposal_notes: data.disposal_notes || null,
      reason: data.reason,
      notes: data.notes || null,
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir={direction}>
        <DialogHeader>
          <DialogTitle>{t('assets.transfer.title')}</DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium">{asset.name}</p>
          <p className="text-xs text-muted-foreground">{asset.asset_code}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={handleTabChange} dir={direction}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="location_transfer" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="hidden sm:inline">{t('assets.transfer.locationTransfer')}</span>
                </TabsTrigger>
                <TabsTrigger value="disposal" className="flex items-center gap-1">
                  <Trash2 className="h-3 w-3" />
                  <span className="hidden sm:inline">{t('assets.transfer.disposal')}</span>
                </TabsTrigger>
                <TabsTrigger value="decommission" className="flex items-center gap-1">
                  <Power className="h-3 w-3" />
                  <span className="hidden sm:inline">{t('assets.transfer.decommission')}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="location_transfer" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="to_branch_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('assets.transfer.newLocation')}</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('to_site_id', '');
                          form.setValue('to_building_id', '');
                          form.setValue('to_floor_zone_id', '');
                        }}
                        dir={direction}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('orgStructure.selectBranch')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {branches.map((branch) => (
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

                {selectedBranchId && sites.length > 0 && (
                  <FormField
                    control={form.control}
                    name="to_site_id"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('to_building_id', '');
                            form.setValue('to_floor_zone_id', '');
                          }}
                          dir={direction}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('assets.location.selectSite')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sites.map((site) => (
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
                )}

                {selectedSiteId && buildings.length > 0 && (
                  <FormField
                    control={form.control}
                    name="to_building_id"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('to_floor_zone_id', '');
                          }}
                          dir={direction}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('assets.location.selectBuilding')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {buildings.map((building) => (
                              <SelectItem key={building.id} value={building.id}>
                                {i18n.language === 'ar' && building.name_ar ? building.name_ar : building.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {selectedBuildingId && floors.length > 0 && (
                  <FormField
                    control={form.control}
                    name="to_floor_zone_id"
                    render={({ field }) => (
                      <FormItem>
                        <Select value={field.value} onValueChange={field.onChange} dir={direction}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('assets.location.selectFloor')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {floors.map((floor) => (
                              <SelectItem key={floor.id} value={floor.id}>
                                {i18n.language === 'ar' && floor.name_ar ? floor.name_ar : floor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </TabsContent>

              <TabsContent value="disposal" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="disposal_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('assets.transfer.disposalMethod')}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} dir={direction}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('common.select')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sold">{t('assets.transfer.methods.sold')}</SelectItem>
                          <SelectItem value="scrapped">{t('assets.transfer.methods.scrapped')}</SelectItem>
                          <SelectItem value="donated">{t('assets.transfer.methods.donated')}</SelectItem>
                          <SelectItem value="recycled">{t('assets.transfer.methods.recycled')}</SelectItem>
                          <SelectItem value="returned">{t('assets.transfer.methods.returned')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="disposal_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('assets.transfer.disposalValue')} ({currency})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="disposal_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('assets.transfer.disposalNotes')}</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="decommission" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  {t('assets.transfer.decommissionDescription')}
                </p>
              </TabsContent>
            </Tabs>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.transfer.reason')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} placeholder={t('assets.transfer.reasonPlaceholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('assets.transfer.notes')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createTransfer.isPending}>
                {createTransfer.isPending ? t('common.saving') : t('assets.transfer.submitRequest')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
